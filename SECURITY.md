# Security Policy

## Supported Versions

Only the latest version of the WashU EM Sim Intelligence app is currently supported for security updates.

| Version | Supported          |
| ------- | ------------------ |
| 3.x     | :white_check_mark: |
| < 3.x   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please **do not open a public issue.** Instead, please contact the maintainer directly.

### Disclosure Process
1.  Report the vulnerability via a private disclosure or by contacting the maintainer.
2.  Maintainers will acknowledge your report within 2-3 business days.
3.  A fix will be prioritized and deployed to the GitHub Pages site and Cloudflare Worker.
4.  Once the fix is verified, a public advisory may be published.

## Best Practices (In-Situ Simulation)
This application handles **Latent Safety Threats** which are critical for patient care.
*   **Access Control**: Ensure your GitHub repository is kept private if it contains patient-sensitive data.
*   **Secret Management**: Do not upload API keys to the repository. Use Cloudflare Secrets or GitHub Environment Secrets.
*   **Data Minimization**: Avoid storing personally identifiable information (PII) of patients or staff in the session notes.
