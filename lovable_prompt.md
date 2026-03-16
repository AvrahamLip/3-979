I need you to build a functional, multi-page Web Application for a Daily Military/Company Attendance Report called "Doch!".
The application must support right-to-left (RTL) natively as the interface will be in Hebrew. Feel free to use your own modern design system and styling choices, just ensure it works well and looks good.

**Core Setup:**
- Language: Hebrew (`lang="he"`, `dir="rtl"`)
- Framework: React / Next.js / Vite (Your preferred stack)
- Include support for Dark/Light mode.

**Data & Logic Requirements:**
- **Data Filtering:** Always filter out any row from the API where the `name` field is empty or missing.
- **Status Normalization (CRITICAL):**
  - "V" or "1" ➔ Maps to "בבסיס" (At Base)
  - "" (empty string) or "0" ➔ Maps to "בבית" (At Home)
  - "2" or "גימלים" ➔ Maps to "מחלה / גימלים" (Sick)
  - Anything else ➔ Maps to "אחר" (Other)
- **API Formatting:** The Date picker gives `YYYY-MM-DD`. You must convert this to `DD/MM/YYYY` before sending it to the APIs.

**App Structure & Routing:**
The app has 2 main pages/views. You can use standard routing or tab navigation.

### Page 1: Main Page (דוח נוכחות יומי)
- **Header Section:** 
  - Title: "דוח נוכחות יומי".
  - Date Picker: Defaults to today. Triggers API fetch on change.
- **API Endpoint:** `GET https://151.145.89.228.sslip.io/webhook/Doch-1?date={DD/MM/YYYY}` 
  - Returns a JSON array of objects: `{name, department, role, todayValue}`.
- **Summary Section (Top):**
  - **Legend Card:** Shows the 4 possible statuses.
  - **Total Company Card:** Shows the overall total of people (Base / Total) and a count breakdown for each of the 4 statuses.
  - **Global Roles Card:** Shows a breakdown by `role`. For each role, show total on base / total in role, and the counts for the 4 statuses.
  - **Department Accordion/Collapsible Cards:** Group the data by `department`. For each department, show a collapsible section. The summary shows "Department Name" and "Total at Base". The expanded view shows a breakdown by `role` inside that department (with status counts).
- **Details Section (Bottom):**
  - Title: "פירוט שמי".
  - **Filters:** 4 inline inputs/selects to filter the table below: Free text search (Name/Role), Department Dropdown, Role Dropdown, Status Dropdown.
  - **Table:** A responsive table displaying Name, Department, Role, and Status.

### Page 2: Zama Page (דוח נוכחות - צמ"ה)
- **Header Section:** 
  - Title: "דוח נוכחות - צמ"ה".
  - Date picker (same behavior as Main Page).
- **API Logic:** This page fetches data for 4 specific departments ONLY.
  - Departments to fetch: `['המושבה - פ"ת', 'צרעה', 'מכון ויצמן - רחובות', 'מפל"ג']`.
  - Fetch them in parallel using: `GET https://151.145.89.228.sslip.io/webhook/Zama/Doch-1?id={encoded_dept_name}&date={DD/MM/YYYY}`.
  - The API returns an object with a `data` array or just the array directly. Handle both safely.
- **Content:**
  - **Legend:** Show the status legend at the top.
  - Render a collapsible section for each of the 4 departments.
  - **Department Section Header:** Department Name and Total at Base / Total People.
  - **Department Section Body:** 
    - Overview totals (Base, Home, Sick, Other).
    - Role breakdown list (same logic as Main page).
    - An isolated table ONLY for the people in this specific department (Name, Department, Role, Status).

### State & Loading UX
- Show a loading spinner/overlay while data is fetching from the APIs.
- Show a "No data found for this date" message if the API returns an empty array. 
- Handle fetch errors gracefully with a clear error message.
