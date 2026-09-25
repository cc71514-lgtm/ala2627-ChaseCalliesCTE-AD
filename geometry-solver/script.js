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

  if (imagePreview.src.startsWith("blob:")) URL.revokeObjectURL(imagePreview.src);
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
  solutionState.hidden = true;
  errorState.textContent = message;
  errorState.hidden = false;
  answerColumn.setAttribute("aria-busy", "false");
}

function hideError() {
  errorState.hidden = true;
  if (emptyState.hidden && solutionState.hidden) emptyState.hidden = false;
}

function solveProblem() {
  const problem = problemInput.value.trim();

  if (!problem) {
    showError(selectedImage
      ? "Screenshots are shown as a reference only. Type the question and its measurements below."
      : "Type a geometry question first.");
    return;
  }

  emptyState.hidden = true;
  errorState.hidden = true;
  try {
    solutionText.textContent = solveGeometryProblem(problem);
    solutionState.hidden = false;
  } catch (error) {
    showError(error.message || "That problem is not supported yet.");
  }
}

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
