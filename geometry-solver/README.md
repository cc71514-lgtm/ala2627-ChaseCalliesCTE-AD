# Angle Geometry Solver

A standalone static web app for uploading or pasting a geometry screenshot, typing a question, and requesting an answer with steps from Google Gemini.

## Use it

1. Open `index.html` in a browser or serve the repository with `python3 -m http.server 8000` and visit `/geometry-solver/`.
2. Add a Gemini API key in the API key field. The key is held in memory for the current page only and cleared when the page reloads.
3. Upload, drag in, or paste a geometry screenshot, or type the question, then select **Solve problem**.

An internet connection and a valid Gemini API key with Gemini API access are required. The image and question are sent to Google's Gemini API. Do not use an API key you are not allowed to use, and check Google's current pricing and data policies before sending schoolwork or personal information. This static app has no server of its own and does not persist your API key.

AI can misread diagrams or make mistakes. Verify the answer and steps.
