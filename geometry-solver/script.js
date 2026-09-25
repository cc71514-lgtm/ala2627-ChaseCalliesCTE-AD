const apiKeyInput = document.querySelector("#api-key");
const keyPanel = document.querySelector("#key-panel");
const keyToggle = document.querySelector("#settings-toggle");
const keyVisibility = document.querySelector("#key-visibility");
const imageInput = document.querySelector("#image-input");
const uploadArea = document.querySelector("#upload-area");
const imagePreviewWrap = document.querySelector("#image-preview-wrap");
const imagePreview = document.querySelector("#image-preview");
const imageName = document.querySelector("#image-name");
const removeImageButton = document.querySelector("#remove-image");
const problemInput = document.querySelector("#problem-input");
const solveButton = document.querySelector("#solve-button");
const answerColumn = document.querySelector(".answer-column");
const emptyState = document.querySelector("#empty-state");
const loadingState = document.querySelector("#loading-state");
const solutionState = document.querySelector("#solution-state");
const solutionText = document.querySelector("#solution-text");
const errorState = document.querySelector("#error-state");
const copyButton = document.querySelector("#copy-button");

let selectedImage = null;

function setImage(file) {
  if (!file) return;
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    showError("Choose an image file such as a PNG, JPG, or WEBP screenshot.");
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showError("That image is over 10 MB. Choose a smaller screenshot.");
    return;
  }

  selectedImage = file;
  imagePreview.src = URL.createObjectURL(file);
  imageName.textContent = file.name || "Pasted screenshot";
  imagePreviewWrap.hidden = false;
  hideError();
}

function clearImage() {
  if (imagePreview.src.startsWith("blob:")) URL.revokeObjectURL(imagePreview.src);
  imagePreview.removeAttribute("src");
  selectedImage = null;
  imageInput.value = "";
  imagePreviewWrap.hidden = true;
}

function showError(message) {
  emptyState.hidden = true;
  loadingState.hidden = true;
  solutionState.hidden = true;
  errorState.textContent = message;
  errorState.hidden = false;
  answerColumn.setAttribute("aria-busy", "false");
}

function hideError() {
  errorState.hidden = true;
  if (emptyState.hidden && solutionState.hidden && loadingState.hidden) emptyState.hidden = false;
}

function parseApiError(payload, status) {
  const detail = payload?.error?.message;
  if (status === 400 || status === 403) return detail || "The API key was rejected. Check that it is valid and that Gemini API access is enabled.";
  if (status === 429) return "Gemini's request limit was reached. Wait a moment and try again.";
  return detail || `Gemini returned an error (HTTP ${status}). Please try again.`;
}

async function fileAsInlineData(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return { mime_type: file.type, data: btoa(binary) };
}

async function solveProblem() {
  const apiKey = apiKeyInput.value.trim();
  const problem = problemInput.value.trim();

  if (!selectedImage && !problem) {
    showError("Add a screenshot or type your geometry question first.");
    return;
  }
  if (!apiKey) {
    keyPanel.hidden = false;
    keyToggle.setAttribute("aria-expanded", "true");
    apiKeyInput.focus();
    showError("Add your Gemini API key to get an AI-generated solution. The key is only kept in this tab.");
    return;
  }

  emptyState.hidden = true;
  errorState.hidden = true;
  solutionState.hidden = true;
  loadingState.hidden = false;
  answerColumn.setAttribute("aria-busy", "true");
  solveButton.disabled = true;
  solveButton.querySelector(".solve-label").textContent = "Working…";

  try {
    const prompt = [
      "Solve this geometry problem. Inspect the attached image carefully if there is one.",
      problem ? `The student's question or extra context: ${problem}` : "The problem is shown in the image. Read the labels and question from it.",
      "Give the final answer first on its own line, then show a short, clear step-by-step solution with the geometry rule or formula used. Include units. If any part of the image is unreadable or information is missing, say exactly what needs clarification instead of guessing. Use plain text, not markdown formatting."
    ].join("\n\n");
    const parts = [{ text: prompt }];
    if (selectedImage) parts.push({ inline_data: await fileAsInlineData(selectedImage) });

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1200 }
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(parseApiError(payload, response.status));

    const answer = payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim();
    if (!answer) throw new Error("Gemini returned no solution. Try a clearer screenshot or add the question as text.");

    solutionText.textContent = answer;
    loadingState.hidden = true;
    solutionState.hidden = false;
  } catch (error) {
    showError(error instanceof TypeError
      ? "Could not reach Gemini. Check your internet connection and try again."
      : error.message || "Something went wrong. Please try again.");
  } finally {
    solveButton.disabled = false;
    solveButton.querySelector(".solve-label").textContent = "Solve problem";
    answerColumn.setAttribute("aria-busy", "false");
  }
}

keyToggle.addEventListener("click", () => {
  keyPanel.hidden = !keyPanel.hidden;
  keyToggle.setAttribute("aria-expanded", String(!keyPanel.hidden));
});

keyVisibility.addEventListener("click", () => {
  const showKey = apiKeyInput.type === "password";
  apiKeyInput.type = showKey ? "text" : "password";
  keyVisibility.setAttribute("aria-label", showKey ? "Hide API key" : "Show API key");
  keyVisibility.title = showKey ? "Hide API key" : "Show API key";
});

imageInput.addEventListener("change", () => setImage(imageInput.files[0]));
removeImageButton.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  clearImage();
});
solveButton.addEventListener("click", solveProblem);

uploadArea.addEventListener("keydown", (event) => {
  if (event.target === uploadArea && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    imageInput.click();
  }
});
uploadArea.addEventListener("dragover", (event) => {
  event.preventDefault();
  uploadArea.classList.add("is-dragging");
});
uploadArea.addEventListener("dragleave", () => uploadArea.classList.remove("is-dragging"));
uploadArea.addEventListener("drop", (event) => {
  event.preventDefault();
  uploadArea.classList.remove("is-dragging");
  setImage(event.dataTransfer.files[0]);
});
document.addEventListener("paste", (event) => {
  const image = [...(event.clipboardData?.items || [])]
    .find((item) => item.type.startsWith("image/"))
    ?.getAsFile();
  if (image) setImage(image);
});
copyButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(solutionText.textContent);
    copyButton.querySelector("span").textContent = "Copied";
    window.setTimeout(() => { copyButton.querySelector("span").textContent = "Copy solution"; }, 1500);
  } catch {
    showError("Clipboard access is unavailable. Select and copy the solution text instead.");
  }
});
