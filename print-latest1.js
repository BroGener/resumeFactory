const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");

// 定义导出目录根路径。
// Define the root export directory.
//const EXPORT_ROOT = path.resolve(__dirname, "..", "exports");

// 确保目录存在，如果不存在就递归创建。
// Ensure a directory exists, creating it recursively if needed.
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}
function getExportDir(category) {
  if (category === "resume") {
    return path.resolve(__dirname, "..", "exports-resume");
  }

  if (category === "coverletter") {
    return path.resolve(__dirname, "..", "exports-coverletter");
  }

  return null;
}

// 执行 git 命令并返回字符串结果。
// Run a git command and return the string output.
function git(args, cwd) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

// 获取当前仓库的根目录。
// Get the root directory of the current repository.
function getRepoRoot(startDir) {
  return git(["rev-parse", "--show-toplevel"], startDir);
}

// 获取最新一次 commit 的 message。
// Get the latest commit message.
function getLatestCommitMessage(repoRoot) {
  return git(["log", "-1", "--pretty=%s"], repoRoot);
}

// 把字符串清理成安全文件名。
// Sanitize a string into a safe filename.
function sanitizeFilename(name) {
  return name
    .toLowerCase()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

// 生成不重复的输出文件名，避免覆盖已有 PDF。
// Generate a unique output filename to avoid overwriting existing PDFs.
function getNextFilename(basePath, ext) {
  let count = 0;
  let filename = `${basePath}.${ext}`;

  while (fs.existsSync(filename)) {
    count += 1;
    filename = `${basePath}(${count}).${ext}`;
  }

  return filename;
}

// 读取最新一次 commit 中改动过的 HTML 文件。
// Read the HTML files changed in the latest commit.
function getChangedHtmlFilesInHead(repoRoot) {
  const output = git(
    ["diff-tree", "--root", "--no-commit-id", "--name-only", "-r", "HEAD", "--", "*.html"],
    repoRoot,
  );

  if (!output) {
    return [];
  }

  return output
    .split("\n")
    .map((file) => file.trim())
    .filter(Boolean);
}

// 根据路径判断文件属于 resume 还是 coverletter。
// Decide whether a file belongs to resume or coverletter based on its path.
function classifyHtmlFile(filePath) {
  const normalized = filePath.replace(/\\/g, "/").toLowerCase();
if (
  normalized.includes("cover letter") ||
  normalized.includes("cover-letter") ||
  normalized.includes("coverletter")
) {
  return "coverletter";
}

  if (normalized.includes("resume")) {
    return "resume";
  }

  return null;
}

// 从 Git 的 HEAD 中读取指定文件内容。
// Read the content of a specific file from Git HEAD.
function getFileContentFromHead(repoRoot, relativeFilePath) {
  return git(["show", `HEAD:${relativeFilePath}`], repoRoot);
}

// 把 HEAD 里的 HTML 内容写入临时文件，并返回临时文件路径与清理函数。
// Write HTML content from HEAD into a temporary file and return its path with a cleanup function.
function createTempHtmlFromHead(repoRoot, relativeFilePath) {
  const tempBase = fs.mkdtempSync(path.join(os.tmpdir(), "git-print-"));
  const tempHtmlPath = path.join(tempBase, path.basename(relativeFilePath));

  const htmlContent = getFileContentFromHead(repoRoot, relativeFilePath);
  fs.writeFileSync(tempHtmlPath, htmlContent, "utf8");

  return {
    htmlPath: tempHtmlPath,
    cleanup: () => {
      try {
        fs.rmSync(tempBase, { recursive: true, force: true });
      } catch (err) {
        console.warn("⚠️ Failed to remove temp directory:", err.message);
      }
    },
  };
}
// 导出单个 HTML 文件到 PDF。
// Export one HTML file to PDF.
async function exportHtmlToPdf(htmlPath, outputPath) {
  const browser = await puppeteer.launch();
  try {
    const page = await browser.newPage();

    await page.goto(`file://${htmlPath}`, {
      waitUntil: "networkidle0",
    });

    await page.pdf({
      path: outputPath,
      format: "Letter",
      printBackground: true,
      displayHeaderFooter: false,
      margin: {
        top: "0.5in",
        bottom: "0.5in",
        left: "0.5in",
        right: "0.5in",
      },
    });
  } finally {
    await browser.close();
  }
}

// 主流程：读取最新 commit 中改动的 HTML，然后按分类导出。
// Main flow: read HTML files changed in the latest commit and export them by category.
// 主流程：读取最新 commit 中改动的 HTML，然后按分类导出。
// Main flow: read HTML files changed in the latest commit and export them by category.
(async () => {
  try {
    const repoRoot = getRepoRoot(__dirname);
    const commitMessage = getLatestCommitMessage(repoRoot);
    const safeCommitMessage = sanitizeFilename(commitMessage) || "no-message";

    const changedHtmlFiles = getChangedHtmlFilesInHead(repoRoot);

    if (changedHtmlFiles.length === 0) {
      console.log("ℹ️ No HTML files changed in the latest commit.");
      process.exit(0);
    }

    for (const relativeFile of changedHtmlFiles) {
      const category = classifyHtmlFile(relativeFile);

      // 如果文件不属于 resume 或 coverletter，就跳过。
      // Skip the file if it is neither resume nor coverletter.
      if (!category) {
        console.log(`ℹ️ Skipped (unknown category): ${relativeFile}`);
        continue;
      }

      const exportDir = getExportDir(category);

      // 如果没有对应的导出目录，就跳过。
      // Skip if there is no export directory for this category.
      if (!exportDir) {
        console.log(`ℹ️ Skipped (no export dir): ${relativeFile}`);
        continue;
      }

      ensureDir(exportDir);

//your name_category-commitmessage.pdf
      const outputBasePath = path.join(exportDir, `YourName_${category}-${safeCommitMessage}`);
      const outputPath = getNextFilename(outputBasePath, "pdf");

      let tempHtml = null;

      try {
        // 从 HEAD 里读取当前 HTML 文件，并写入临时文件。
        // Read the current HTML file from HEAD and write it to a temporary file.
        tempHtml = createTempHtmlFromHead(repoRoot, relativeFile);

        // 如果临时 HTML 文件不存在，就跳过。
        // Skip if the temporary HTML file does not exist.
        if (!fs.existsSync(tempHtml.htmlPath)) {
          console.log(`⚠️ Temp HTML not found: ${relativeFile}`);
          continue;
        }

        await exportHtmlToPdf(tempHtml.htmlPath, outputPath);

        console.log(`✅ Exported ${relativeFile} -> ${outputPath}`);
      } finally {
        // 无论成功还是失败，都清理临时文件。
        // Clean up the temporary file whether the export succeeds or fails.
        if (tempHtml) {
          tempHtml.cleanup();
        }
      }
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exitCode = 1;
  }
})();
