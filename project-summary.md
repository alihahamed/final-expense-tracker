# Project Summary: KINETIC (Expense Tracker & Ordering System)

**Project Context:** "KINETIC" is a comprehensive web application developed as a BCA academic
project. Interestingly, the system documentation outlines a hybrid platform that blends
**Financial Expense Tracking** with a **QR-Based Restaurant Ordering System (referred to as
ScanEat/Isra's Cafe)**.

Below is a filtered, high-level summary of the system's actual features, architecture, and
technical specifications.

## 1. Core System Modules

The application is divided into several primary modules serving different end-users (Individuals,
Groups, Customers, and Admins).

**Financial & Expense Tracking**

```
Transaction Management: Users can log, edit, and delete income and expenses,
categorized with dates and notes.
Ledger Management: Supports the creation of multiple distinct ledgers (e.g., personal,
trips).
Collaboration: Users can invite others to shared ledgers and assign specific access roles
(viewer or editor).
Financial Dashboard: Provides real-time summaries of balances, total income, and total
expenses.
```
**Restaurant Ordering (ScanEat System)**

```
QR-Based Menu: Customers scan table QR codes to access a digital menu without
needing physical menus.
Cart & Checkout: Users can add/remove items, adjust quantities, view real-time sub-totals
(with taxes), and proceed to secure payment gateways.
Advanced Accessibility Inputs: The system uniquely integrates Voice Recognition ,
Hand Gesture Controls , and Facial Recognition for hands-free menu navigation and user
interaction.
```
**Admin & Staff Controls**

```
Menu Management: Admins can dynamically add, update, or remove food items (name,
price, category, image, availability).
```

```
Order Tracking: Live monitoring of customer orders and status updates (Preparing, Ready,
Completed).
Payment & Billing: Tracks successful/pending payments and generates digital receipts.
```
## 2. Technical Architecture & Stack

The system operates on a modern three-tier architecture (Frontend, Backend, Database)
ensuring real-time synchronization.

```
Frontend (UI/UX): React.js, Chakra UI, Vite, JavaScript, HTML, CSS.
Backend & Database: Supabase (PostgreSQL-based cloud database for real-time API
handling and OAuth authentication). SQLite3 is used for lightweight local data handling.
Advanced Modules (Python): Python 3.11 utilizing OpenCV, Mediapipe, PyAudio, and dlib
for handling facial recognition and gesture/voice commands.
Hardware Requirements: HD Webcam and Microphone (for advanced inputs), and
standard smart devices for users/staff.
```
## 3. Database Design

The relational database is structured to handle both the financial and e-commerce aspects of
the application. Key tables include:

```
Users: Stores credentials, hashed passwords, and preferences.
Ledgers & Transactions: Links financial records to specific users and shared groups.
Menu/Products: Stores item details, categories, and images.
Orders & Payments: Tracks cart items, transaction amounts, and payment statuses.
```
## 4. System Testing & Validation

```
Unit & Integration Testing: Ensured all individual modules (adding transactions, updating
menus) correctly sync with the Supabase database in real-time.
Security: Validated OAuth 2.0 Google login and secure data retrieval (e.g., fetching public
URLs for images).
Performance: Tested UI responsiveness and cart state management using React Context
API.
```
## 5. Limitations

```
Internet Dependency: The system relies heavily on a stable network for Supabase
database sync, order placement, and menu fetching.
```

```
Hardware Constraints: Voice, gesture, and facial recognition features require specific,
functional camera/microphone hardware.
Offline Support: No capability to process orders or financial updates offline.
```
## 6. Future Scope for Enhancement

```
AI Recommendations: Suggesting dishes based on user history or dietary preferences.
Biometric Security: Implementing fingerprint or advanced facial login for quicker, secure
access.
Expanded Payments: Direct integration with UPI, NFC, and digital wallets.
Offline Mode: Allowing cached menus and queued local orders for areas with poor
connectivity.
Smart Analytics: Providing admins with dashboards for peak hours, top-selling items, and
user demographics
```

