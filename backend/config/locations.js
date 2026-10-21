
const regions = {
  Delhi: {
    Transport: [
      "New Delhi Railway Station",
      "Old Delhi Railway Station",
      "Hazrat Nizamuddin Railway Station",
      "Anand Vihar ISBT",
      "Kashmere Gate ISBT",
      "Sarai Kale Khan ISBT",
      "IGI Airport Terminal 1",
      "IGI Airport Terminal 2",
      "IGI Airport Terminal 3"
    ],
    Areas: [
      "Connaught Place", "Chandni Chowk", "Karol Bagh",
      "Lajpat Nagar", "Saket", "Dwarka", "Rohini",
      "Pitampura", "Janakpuri", "Laxmi Nagar",
      "Nehru Place", "Mayur Vihar", "Vasant Kunj", "Narela"
    ],
    Landmarks: [
      "India Gate", "Red Fort", "Qutub Minar", "Akshardham"
    ]
  },

  Meerut: {
    Transport: [
      "Meerut City Railway Station", "Meerut Cantt Railway Station",
      "Bhainsali Bus Stand", "Shatabdi Nagar Bus Stop", "Modipuram"
    ],
    Areas: [
      "Sadar Bazaar Meerut", "Abu Lane Meerut", "Begum Bridge Meerut",
      "Shastri Nagar Meerut", "Pallavpuram Meerut", "Ganga Nagar Meerut",
      "Jagriti Vihar Meerut", "Lisari Gate Meerut", "Delhi Road Meerut",
      "Mawana Road Meerut", "Garh Road Meerut", "Kanker Khera Meerut",
      "Kali Paltan Mandir Meerut"
    ],
    Institutions: [
      "Chaudhary Charan Singh University Meerut",
      "Swami Vivekanand Subharti University Meerut",
      "LLRM Medical College Meerut"
    ]
  },

  Faridabad: {
    Transport: [
      "Faridabad Railway Station", "Faridabad New Town Railway Station",
      "Old Faridabad Bus Stand", "Ballabhgarh"
    ],
    Areas: [
      "NIT Faridabad", "Sector 15 Faridabad", "Sector 16 Faridabad",
      "Sector 21 Faridabad", "Sector 29 Faridabad", "Sector 37 Faridabad",
      "Greater Faridabad", "Neelam Chowk Faridabad",
      "Surajkund Faridabad", "Badkhal Faridabad"
    ]
  },

  Gurugram: {
    Transport: [
      "Gurugram Railway Station", "Gurugram Bus Stand",
      "IFFCO Chowk", "Rajiv Chowk Gurugram",
      "Huda City Centre Metro", "Sikanderpur Metro Station"
    ],
    Areas: [
      "Cyber City Gurugram", "Golf Course Road Gurugram",
      "MG Road Gurugram", "Sohna Road Gurugram",
      "Udyog Vihar Gurugram", "DLF Phase 1 Gurugram",
      "DLF Phase 2 Gurugram", "DLF Phase 3 Gurugram",
      "DLF Phase 4 Gurugram", "DLF Phase 5 Gurugram",
      "Sushant Lok Gurugram", "Manesar",
      "Sector 14 Gurugram", "Sector 56 Gurugram",
      "Palam Vihar Gurugram"
    ]
  },

  Noida: {
    Transport: [
      "Noida Sector 18 Metro Station", "Noida City Centre Metro",
      "Botanical Garden Metro Station", "Noida Sector 37 Bus Stand",
      "Noida Sector 62 Metro Station"
    ],
    Areas: [
      "Noida Sector 18", "Noida Sector 62", "Noida Sector 63",
      "Noida Sector 76", "Noida Sector 137", "Noida Sector 128",
      "Noida Film City", "Noida Expressway",
      "Atta Market Noida", "Noida Sector 15", "Noida Sector 50"
    ]
  },

  "Greater Noida": {
    Transport: [
      "Pari Chowk Greater Noida", "Alpha 1 Greater Noida",
      "Alpha 2 Greater Noida", "Greater Noida Bus Stand",
      "Knowledge Park II Greater Noida", "Greater Noida Aqua Line Metro"
    ],
    Areas: [
      "Greater Noida West", "Gaur City Greater Noida",
      "Omicron Greater Noida", "Beta Greater Noida",
      "Gamma Greater Noida", "Delta Greater Noida",
      "Jewar", "Dadri", "Buddh International Circuit",
      "India Expo Mart Greater Noida"
    ]
  },

  Ghaziabad: {
    Transport: [
      "Ghaziabad Junction Railway Station", "Anand Vihar",
      "Kaushambi Bus Stand", "Shaheed Sthal New Bus Adda",
      "Hindon Airport", "Vaishali Metro Station"
    ],
    Areas: [
      "Indirapuram Ghaziabad", "Vaishali Ghaziabad",
      "Kaushambi Ghaziabad", "Raj Nagar Ghaziabad",
      "Raj Nagar Extension Ghaziabad", "Vasundhara Ghaziabad",
      "Sahibabad", "Mohan Nagar Ghaziabad", "Loni Ghaziabad",
      "Crossings Republik Ghaziabad", "Modinagar",
      "Muradnagar", "Dasna"
    ]
  },

  Baghpat: {
    Transport: [
      "Baghpat Road Railway Station", "Baghpat Bus Stand",
      "Baraut Bus Stand", "Khekra"
    ],
    Areas: [
      "Baraut", "Khekra", "Binauli", "Chhaprauli",
      "Sanauli Baghpat", "Barnawa", "Pura Mahadev",
      "Ramala", "Doghat"
    ]
  }
};

// Start with selected locations; expand after verifying API usage.
const activeNames = new Set([
  // Existing Delhi locations
  "Connaught Place",
  "India Gate",
  "Lajpat Nagar",
  "Saket",
  "Dwarka",
  "Rohini",

  // Additional Delhi locations
  "New Delhi Railway Station",
  "Anand Vihar ISBT",
  "IGI Airport Terminal 3",
  "Chandni Chowk",
  "Nehru Place",

  // Meerut
  "Meerut City Railway Station",
  "Begum Bridge Meerut",
  "Delhi Road Meerut",

  // Faridabad
  "Faridabad Railway Station",
  "Neelam Chowk Faridabad",
  "Badkhal Faridabad",

  // Gurugram
  "Cyber City Gurugram",
  "IFFCO Chowk",
  "Rajiv Chowk Gurugram",

  // Noida
  "Noida Sector 18",
  "Noida Sector 62",
  "Noida Expressway",

  // Greater Noida
  "Pari Chowk Greater Noida",
  "Knowledge Park II Greater Noida",
  "Greater Noida West",

  // Ghaziabad
  "Kaushambi Ghaziabad",
  "Indirapuram Ghaziabad",
  "Shaheed Sthal New Bus Adda",

  // Baghpat
  "Baghpat Bus Stand",
  "Baraut",
  "Khekra"
]);

const LOCATION_CATALOG = Object.entries(regions).flatMap(
  ([region, categories]) =>
    Object.entries(categories).flatMap(([category, names]) =>
      names.map(name => ({
        region,
        category,
        name,
        isActive: activeNames.has(name)
      }))
    )
);

const ACTIVE_LOCATIONS = LOCATION_CATALOG.filter(
  location => location.isActive
);

module.exports = {
  LOCATION_CATALOG,
  ACTIVE_LOCATIONS
};
