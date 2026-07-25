export type NavItem = {
  href: string;
  label: string;
  short: string;
};

export const primaryNav: NavItem[] = [
  { href: "/", label: "Dashboard", short: "Home" },
  { href: "/doctors", label: "Doctors", short: "Doctors" },
  { href: "/pharmacy", label: "Pharmacy", short: "Pharmacy" },
  { href: "/lab-tests", label: "Lab Tests", short: "Labs" },
  { href: "/ct-mri", label: "CT / MRI", short: "CT / MRI" },
  { href: "/rental-equipment", label: "Rental Equipment", short: "Rental" },
  { href: "/hospitals", label: "Hospitals", short: "Hospitals" },
  { href: "/health-card", label: "Health Card", short: "Health Card" },
  { href: "/care-staff", label: "Care Staff", short: "Care Staff" },
  { href: "/ambulance", label: "Ambulance", short: "Ambulance" },
  { href: "/appointments", label: "Appointments", short: "Appointments" },
  { href: "/records", label: "Records", short: "Records" },
  { href: "/instant-call", label: "Instant Call", short: "Call" },
  { href: "/profile", label: "Profile", short: "Profile" },
];

export const heroStats = [
  { label: "Nearby Doctors", value: "148", detail: "Verified providers available today" },
  { label: "Lab Slots", value: "39", detail: "Same-day collection and reports" },
  { label: "Medicine Offers", value: "216", detail: "Discounted pharmacy listings" },
  { label: "Emergency Response", value: "12 min", detail: "Average ambulance dispatch time" },
];

export const serviceCards = [
  {
    title: "Doctor Consultation",
    subtitle: "Book clinic, voice, video, or chat consultations with verified doctors.",
    href: "/doctors",
    accent: "blue",
    action: "Explore Doctors",
  },
  {
    title: "Medicines",
    subtitle: "Browse approved pharmacies, compare prices, and place home-delivery orders.",
    href: "/pharmacy",
    accent: "green",
    action: "Order Medicines",
  },
  {
    title: "Lab Tests",
    subtitle: "Compare nearby lab prices, choose tests, and track reports online.",
    href: "/lab-tests",
    accent: "amber",
    action: "Book Lab Tests",
  },
  {
    title: "Hospitals & Surgery",
    subtitle: "Review hospitals, compare treatments, and book consultation slots.",
    href: "/hospitals",
    accent: "rose",
    action: "View Hospitals",
  },
  {
    title: "Ambulance",
    subtitle: "Request emergency support, confirm pickup, and monitor live status.",
    href: "/ambulance",
    accent: "indigo",
    action: "Request Ambulance",
  },
  {
    title: "Instant Call",
    subtitle: "Connect with an available doctor fast for urgent guidance.",
    href: "/instant-call",
    accent: "teal",
    action: "Start Instant Call",
  },
];

export const featuredDoctors = [
  { name: "Dr. Bhadra Asha", specialty: "Cardiologist", fee: "₹800", availability: "Video, Voice, Clinic", rating: "4.9" },
  { name: "Dr. Akshaya Murali", specialty: "Neurologist", fee: "₹1,200", availability: "Video, Clinic", rating: "4.8" },
  { name: "Dr. Saiman Care", specialty: "General Physician", fee: "₹500", availability: "Instant Call, Chat", rating: "4.7" },
];

export const featuredPharmacy = [
  { name: "Apollo Pharmacy", offer: "18% off on diabetes care", eta: "30 min", price: "₹285 onwards" },
  { name: "HealthCare Pharmacy", offer: "Same-day delivery in your area", eta: "25 min", price: "₹199 onwards" },
  { name: "Sunrise Medico", offer: "Free delivery above ₹499", eta: "40 min", price: "₹149 onwards" },
];

export const featuredTests = [
  { name: "Complete Blood Count", lab: "Care Diagnostics", price: "₹299", report: "6 hrs" },
  { name: "Thyroid Profile", lab: "Metro Lab", price: "₹499", report: "12 hrs" },
  { name: "Liver Function Test", lab: "Health Scan Labs", price: "₹650", report: "Same day" },
];

export const featuredHospitals = [
  { name: "Saiman Multispeciality", focus: "Cardiac & critical care", price: "₹499 consult", city: "Hyderabad" },
  { name: "Sunrise Hospital", focus: "Neuro & orthopaedic surgery", price: "₹699 consult", city: "Bangalore" },
  { name: "WellCare Medical Center", focus: "Women & child health", price: "₹549 consult", city: "Chennai" },
];

export const appointmentTimeline = [
  { title: "Video consultation", provider: "Dr. Bhadra Asha", when: "Today, 09:00 PM", status: "Confirmed" },
  { title: "Thyroid Profile", provider: "Metro Lab", when: "26 Jul 2026, 08:30 AM", status: "Collection Pending" },
  { title: "Medicine order", provider: "Apollo Pharmacy", when: "27 Jul 2026, 04:15 PM", status: "Packed" },
];

export const healthPrograms = [
  { title: "Family Health Card", detail: "Cover multiple hospital services in one plan.", href: "/subscription-plans" },
  { title: "Digital Records", detail: "Keep prescriptions, reports, and bookings together.", href: "/records" },
  { title: "Emergency Help", detail: "Priority ambulance flow with live dispatch visibility.", href: "/ambulance" },
];

export const recordsSummary = [
  { label: "Prescriptions", value: "24" },
  { label: "Lab Reports", value: "11" },
  { label: "Consultations", value: "17" },
  { label: "Insurance Docs", value: "4" },
];

export const subscriptionPlans = [
  { name: "Starter Care", price: "₹799 / month", detail: "1 video consult, pharmacy savings, digital records." },
  { name: "Family Care", price: "₹1,999 / month", detail: "Multi-member coverage, more consults, ambulance priority." },
  { name: "Saiman Plus", price: "₹4,999 / year", detail: "Best-value yearly plan with care coordination perks." },
];

export const supportTopics = [
  "Booking help",
  "Payments and refunds",
  "Prescription and report access",
  "Emergency dispatch support",
  "Health card verification",
];
