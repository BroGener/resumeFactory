# resumeFactory
Easy generate your fancy resume 
# Resume Factory

A lightweight workflow for writing resumes and cover letters in HTML, then automatically exporting them to PDF after each Git commit.

## Overview

This project provides a simple pipeline:

1. Write your resume or cover letter in HTML
2. Preview and edit using a local development server
3. Commit your changes with Git
4. Automatically generate a PDF version after each commit

The generated PDF file name follows this pattern:

```
YourName_resume|coverletter_commitComment.pdf
```

You can customize this naming logic inside the JavaScript configuration.

---

## Requirements

* [Node.js](https://nodejs.org/)
* A code editor (recommended: VS Code)
* A local server tool (recommended: Live Server extension in VS Code)
* Git

---

## Setup

### 1. Clone the repository

```
git clone https://github.com/BroGener/resumeFactory.git
cd resumeFactory
```

### 2. Install dependencies

If your project includes dependencies:

```
npm install
```

---

## Development Workflow

### 1. Edit HTML

* Open the project in VS Code
* Use **Live Server** (or similar) to preview your HTML in the browser
* Edit your resume or cover letter directly in the HTML files

### 2. Preview Changes

* Right-click the HTML file → "Open with Live Server"
* Make sure layout and styling look correct before committing

---

## Git Automation

This project uses a Git hook (`post-commit`) to automatically generate PDFs.

### How it works

* After you run:

```
git commit -m "your message"
```

* The `post-commit` script triggers:

  * Executes the script (`print-latest.js`)
  * Converts the latest HTML into a PDF
  * Saves it with a generated filename

---

## Output Naming

The PDF filename format is:

```
YourName_resume|coverletter_commitComment.pdf
```

### Customize naming

You can modify the naming logic in:

```
print-latest.js
```

Adjust variables such as:

* Your name
* Document type (resume / cover letter)
* Commit message usage

---

## File Structure (Simplified)

```
resumeFactory/
├── resume_git.html       # Main HTML resume file
├── scripts/print-latest.js       # PDF generation script
├── .git/hooks/post-commit # Git hook (auto-run after commit)
└── ...
```

---

## Notes

* Make sure the `post-commit` hook is executable:

```
chmod +x .git/hooks/post-commit
```

* If the hook does not run, verify:

  * It is correctly placed in `.git/hooks/`
  * It has execution permissions
  * Node.js is properly installed

---

## Suggested Improvements (Optional)

* Add CSS templates for different resume styles
* Support multiple HTML files (resume + cover letter separately)
* Add CLI arguments for flexible PDF export
* Integrate with CI/CD (e.g., GitHub Actions)

---

## License

MIT (or specify your license)

---

## Author

Maintained by BroGener
