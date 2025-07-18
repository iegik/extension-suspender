# Privacy Policy for Tab Suspender Extension

**Last Updated:** July 18, 2024

## Overview

The Tab Suspender Extension is designed with privacy as a core principle. This extension operates entirely locally on your device and does not collect, transmit, or store any personal information externally.

## Data Collection and Storage

### What We Store Locally

The extension stores the following information **only on your device** using Chrome's local storage:

1. **Extension Settings:**
   - Inactivity timeout (1-60 minutes)
   - Enabled/disabled state

2. **Suspended Tab Information:**
   - Tab ID → Original URL mapping (for restoration)
   - Only stored while tabs are suspended

### What We Do NOT Collect

- ❌ **No browsing history**
- ❌ **No page content**
- ❌ **No personal information**
- ❌ **No form data**
- ❌ **No passwords**
- ❌ **No cookies**
- ❌ **No analytics or telemetry**
- ❌ **No network requests to external servers**

## How the Extension Works

### Tab Monitoring
- **What we see:** Tab URLs and activity status (active/inactive)
- **What we don't see:** Page content, form data, or personal information
- **Purpose:** Determine which tabs should be suspended

### Tab Suspension Process
1. **Monitor:** Track which tabs are active vs inactive
2. **Timeout:** After inactivity period, change tab URL to `about:blank#original-url`
3. **Store:** Save original URL locally for restoration
4. **Restore:** When tab is activated, restore original URL

### Data Flow
```
User Activity → Local Storage → Tab Suspension → Local Restoration
     ↓              ↓              ↓              ↓
   No external    No network    No tracking    No data sent
   transmission   requests      or analytics   anywhere
```

## Technical Implementation

### Permissions Required
The extension requests minimal permissions:

```json
"permissions": [
  "tabs",           // Read tab URLs and status (no content access)
  "storage",        // Store settings locally only
  "activeTab",      // Access current tab only
  "webNavigation"   // Monitor URL changes only
]
```

### What Each Permission Does
- **`tabs`:** Read tab URLs to determine if they should be suspended
- **`storage`:** Store settings and suspended tab data locally
- **`activeTab`:** Access current tab for manual suspension/restoration
- **`webNavigation`:** Monitor URL changes for automatic restoration

### What Permissions We DON'T Request
- ❌ **`scripting`** - Cannot inject arbitrary code
- ❌ **`webRequest`** - Cannot intercept network traffic
- ❌ **`cookies`** - Cannot access cookies
- ❌ **`history`** - Cannot access browsing history
- ❌ **`bookmarks`** - Cannot access bookmarks
- ❌ **`downloads`** - Cannot download files

## Data Security

### Local Storage Only
- All data is stored in your browser's local storage
- No data is transmitted to external servers
- No cloud synchronization
- No external dependencies

### No Network Communication
- The extension never makes network requests
- No analytics or telemetry data sent
- No external API calls
- No data collection services

### Code Transparency
- All source code is open and auditable
- No obfuscated or minified code
- No external script loading
- No dynamic code execution

## Privacy Benefits

### What the Extension Protects
- **Memory Usage:** Reduces RAM usage by suspending inactive tabs
- **CPU Usage:** Stops background JavaScript execution
- **Battery Life:** Reduces power consumption on mobile devices
- **Privacy:** No data leaves your device

### How Suspension Works
When a tab is suspended:
1. **URL Changes:** Tab navigates to `about:blank#original-url`
2. **Browser Cleanup:** Browser automatically terminates all background tasks
3. **Memory Freed:** Original page resources are garbage collected
4. **No Tracking:** All timers, animations, and background processes stop

## Data Retention

### Local Storage
- **Settings:** Stored until you change them
- **Suspended Tabs:** Stored only while tabs are suspended
- **Cleanup:** Automatically removed when tabs are closed

### No Persistent Data
- No logs are kept
- No usage statistics
- No analytics data
- No tracking information

## Third-Party Services

### No External Dependencies
- ❌ No Google Analytics
- ❌ No tracking pixels
- ❌ No external APIs
- ❌ No cloud services
- ❌ No third-party libraries

### Extension Store
- The extension is distributed through Chrome Web Store
- Google may collect basic usage statistics (not controlled by us)
- No additional data is sent to us or any third party

## Your Rights

### Data Control
- **View Data:** Check browser's local storage for extension data
- **Delete Data:** Clear browser data to remove all extension data
- **Disable:** Turn off the extension at any time
- **Uninstall:** Remove the extension completely

### Transparency
- **Source Code:** All code is open source and auditable
- **Permissions:** Only minimal permissions required
- **No Hidden Features:** No background data collection

## Security Analysis

### Attack Surface
- **Minimal:** Only 4 basic permissions
- **Local Only:** No network communication
- **No Injection:** No content script injection
- **No External Code:** No dynamic code loading

### Data Protection
- **No Personal Data:** Only stores URLs and settings
- **No Sensitive Info:** Cannot access page content
- **No Tracking:** No user behavior monitoring
- **No Profiling:** No data analysis or profiling

## Compliance

### GDPR Compliance
- ✅ **No personal data collection**
- ✅ **No data processing**
- ✅ **No data transfer**
- ✅ **Local storage only**
- ✅ **User control over data**

### CCPA Compliance
- ✅ **No personal information collected**
- ✅ **No data sold or shared**
- ✅ **No tracking across websites**
- ✅ **Local operation only**

## Contact Information

### Questions About Privacy
If you have questions about this privacy policy or the extension's data handling:

1. **Review the Code:** All source code is available for inspection
2. **Check Permissions:** Review the minimal permissions requested
3. **Monitor Network:** Verify no external requests are made
4. **Local Storage:** Check browser's local storage for extension data

### No External Contact Required
Since the extension operates entirely locally and doesn't collect any data, there's no need for external communication about privacy matters.

## Updates to This Policy

### Policy Changes
- This policy will be updated if the extension's functionality changes
- All changes will be clearly documented
- No changes will affect existing privacy protections

### Version History
- **v1.0** (July 18, 2024): Initial privacy policy

---

**Summary:** This extension is designed to be privacy-first, operating entirely locally without collecting, transmitting, or storing any personal information externally. All data is stored locally on your device and can be easily deleted by clearing browser data.