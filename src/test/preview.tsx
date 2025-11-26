import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const PREVIEWS_DIR = join(__dirname, "../components/__previews__");

const htmlTemplate = (content: string, title: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/daisyui@5/dist/full.min.css" rel="stylesheet">
  <style>
    /* Match the app's base styles */
    body {
      min-height: 100vh;
    }
  </style>
</head>
<body class="bg-base-100 text-base-content p-8" data-theme="dark">
  <div class="max-w-2xl mx-auto">
    ${content}
  </div>
</body>
</html>`;

/**
 * Renders a component for testing and generates a viewable HTML preview.
 *
 * @param ui - The React element to render
 * @param previewName - Filename for the preview (without extension)
 * @returns The render result from @testing-library/react
 *
 * @example
 * const { container } = renderWithPreview(
 *   <UserProfileCard user={user} />,
 *   "UserProfileCard-full"
 * );
 * expect(container).toMatchSnapshot();
 */
export function renderWithPreview(
  ui: ReactElement,
  previewName: string
): RenderResult {
  const result = render(ui);

  // Ensure previews directory exists
  mkdirSync(PREVIEWS_DIR, { recursive: true });

  // Write the HTML preview
  const html = htmlTemplate(result.container.innerHTML, previewName);
  const filePath = join(PREVIEWS_DIR, `${previewName}.html`);
  writeFileSync(filePath, html);

  return result;
}
