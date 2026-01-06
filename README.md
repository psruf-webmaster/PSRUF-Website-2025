# Project Backlog – PSRUF Website

This backlog tracks **completed work**, **in-progress validation**, and **upcoming features** for the Phi Sigma Rho UF website

---

## ✅ Completed

### **Authentication & Core Platform**
- Sign-up and login flows
- Member dashboard foundation
- Role and status based access control across the application

### **Eventsand Sign-Ups**
- Full event lifecycle:
  - Create, edit, and manage events with role-based permissions
  - Visibility rules by role and member status
- RSVP system:
  - Going / Maybe / Not Going
- Attendance tracking with:
  - Event creator permissions
  - Optional co-hosts (currently up to **7**)
- Attendance can be edited before or after events as needed
- Events page:
  - current week
  - this month
  - next month

### **Announcements & Feeds**
- Chapter-wide, Penguin Parties, and officer-only announcement feeds
- Route guards to restrict officer-only feed
- Feed layout and navigation bar

### **Admin Tools**
- Admin approval flow for new accounts
  - Web dev team and Webmaster have admin priviliges
- Admin users page for assigning:
  - Roles
  - Member statuses
  - Positions

### **Points & Ledger System**
- Implemented **PointsLedger** as the single source of truth (source for all point data in displays and calculations)
- Ledger:
  - Attendance-based points
  - Manual officer point adjustments
  - Prevention of negative attendance points
- Member-facing features:
  - Dashboard **“My Points”** summary
  - `/points` page with:
    - Per-category totals (Phi / Sigma / Rho / Tau / Addtl 50 Points)
    - Event-level point breakdown
    - Active Member requirements view
- Admin-facing features:
  - `/points-overview` page
  - Filters, search (basically master points sheet)
  - CSV export
  - “Requirements Met” indicator

### **Active Member Requirements**
- Active requirements implemented:
  - Phi ≥ 50
  - Sigma ≥ 50
  - Rho ≥ 50
  - Tau ≥ 50
  - Additional Points (Any) ≥ 50
- Requirements computed dynamically from ledger totals
- Visible to:
  - Members (self view)
  - Exec / Webmaster / Webdev (overview)

---

## 🟡 In Progress / Needs Validation

### **Testing & Validation**
- Cross-role and cross-status testing:
  - pnm
  - candidate
  - candOfficer
  - member
  - alumni
  - officer
  - exec
  - webmaster
  - webdev
- Verify correct access based on role for:
  - Event management
  - Ledger
  - Points pages (Master points vs regular member points page)
  - Requirements eligibility

### **UI **
  - Dashboard (weekly events + points circles)
  - Member Points page
  - Admin Points Overview page

---
## TO DO 
## 🔴 P0 – Highest Priority (Decision Needed ASAP)

### **Text Message Notifications – Provider Decision**
- Decide on SMS provider:
  - SignalWire vs Twilio
  - Found out some contraints like 49 member max for SignalWire, trying to figure out a workaround or just switching to Twilio
- SignalWire constraints:
  - Campaign limits
  - Member count limits
  - Inactivity penalty fee 
  - Cost structure not transparent, facing additional costs-- not as cheap as it was initially advertised, need to clariy info on that

---

## 🟠 P1 – High Priority (After SMS Provider Is Chosen)

### **Notifications System**
- Announcement notifications:
  - Email on publish
  - Optional SMS blast
  - Audience selection by:
    - Role
    - Member status
    - Position
  - Optional scheduled send time
- **Event reminder notifications**:
  - Event creators can opt-in to automated reminders
  - Reminder types:
    - Email reminder **1 week before** event
    - Email reminder **1 day before** event
    - Optional SMS reminders (provider-dependent)
  - Per-event on/off toggles
  - Server-side scheduling for the automated reminder
  - maybe allow officer to send additional notifs or announcement blasts specific to that event
 
### **UI **
  - LIterally every page
  - Dashboard (weekly events + points circles)
  - Member Points page
  - Admin Points Overview page

---

## 🟢 P2 – Medium Priority

### **User Account Enhancements**
- Password reset flow
- Profile settings page:
  - Edit email
  - Edit phone number
  - Avatar/profile photo upload

### **Calendar**
- Dedicated calendar page
- Embedded Google Calendar for chapter events

### **Public Website**
- Finish and polish all public-facing pages:
  - Home
  - Leadership
  - Recruitment
  - Alumni
  - Partners
  - Contact

---

## 🔵 P3 – Nice to Have / Later

### **Expanded Feeds & Channels**
- Allow exec/officer-level users to:
  - Create new announcement channels
  - Add/remove members from channels

### **Before Deployment**
- Full regression testing after UI and notifications implemented
- Edge-case testing for:
  - Point requirements met and candidate eligibility
  - Ledger consistency
  - Role and status transitions over time

---

## 📝 Notes
- The **ledger is the only source of truth** for points
- Requirements are computed dynamically — no stored flags
- SMS notifs and choosing a provider are the immediate next step
