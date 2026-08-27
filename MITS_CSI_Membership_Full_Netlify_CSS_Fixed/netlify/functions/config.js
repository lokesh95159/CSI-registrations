const { json, env } = require("./_common");

exports.handler = async () => {
  const fee = Number(env("MEMBERSHIP_FEE", "100"));
  return json(200, {
    siteTitle: env("SITE_TITLE", "MITS Professional Society Membership"),
    collegeName: env("COLLEGE_NAME", "Madanapalle Institute of Technology & Science"),
    departmentName: env("DEPARTMENT_NAME", "Department of Computer Science and Engineering"),
    collegeAddress: env("COLLEGE_ADDRESS"),
    contactEmail: env("CONTACT_EMAIL"),
    contactPhone: env("CONTACT_PHONE"),
    societyName: env("SOCIETY_NAME", "Computer Society of India (CSI)"),
    societyJoinUrl: env("SOCIETY_JOIN_URL", "https://www.csi-india.org/"),
    membershipValidity: env("MEMBERSHIP_VALIDITY", "2026-2027"),
    fee: Number.isFinite(fee) ? fee : 100,
    currency: env("CURRENCY", "INR"),
    razorpayKeyId: env("RAZORPAY_KEY_ID")
  });
};
