# Angle Geometry Solver

A standalone static web app that calculates common geometry answers directly in your browser. It makes no AI or network requests and needs no account, API key, or internet connection.

## Use it

1. Open `index.html` in a browser or serve the repository with `python3 -m http.server 8000` and visit `/geometry-solver/`.
2. Type a supported geometry question and select **Solve problem**.
3. You can upload, drag in, or paste a screenshot to keep the diagram visible as a reference. Type its measurements into the question field; the app does not read text or measurements from images.

Supported calculations include triangle angle sums, complementary and supplementary angles, right-triangle hypotenuse and missing-leg calculations, triangle area, square and rectangle area/perimeter, circle area/circumference, and polygon interior angles. Enter the measurements and name the requested calculation clearly. Unsupported or ambiguous questions will ask for clarification instead of contacting an AI service.

The calculations run locally in the browser. Verify the answer and steps.
