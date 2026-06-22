import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  UserCircle, Plus, Phone, Home, Globe,
  Building2, MapPin, Search, Users, RefreshCw,
  X, AlertCircle, Check, Edit2, Eye, ChevronDown,
  ChevronUp, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight,
  Filter, Mail, Loader2
} from 'lucide-react';
import './Common1.css';
import { apiService } from '../api/api';
import { useResizableColumns } from '../hooks/useResizableColumns';
/* ─────────────────────────────────────────
   CONSTANTS & HELPERS
───────────────────────────────────────── */
const EMPTY_FORM = {
  ownerName: '', alternateContactName: '', ownerAddress: '',
  phone1: '', phone2: '', city: '', district: '',
  state: '', country: 'India', emailAddress: '',
};
/* ─────────────────────────────────────────
   INDIA STATES & DISTRICTS
───────────────────────────────────────── */
const INDIA_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

const DISTRICTS_BY_STATE = {
  'Gujarat': [
    'Ahmedabad', 'Amreli', 'Anand', 'Aravalli', 'Banaskantha', 'Bharuch',
    'Bhavnagar', 'Botad', 'Chhota Udaipur', 'Dahod', 'Dang', 'Devbhoomi Dwarka',
    'Gandhinagar', 'Gir Somnath', 'Jamnagar', 'Junagadh', 'Kheda', 'Kutch',
    'Mahisagar', 'Mehsana', 'Morbi', 'Narmada', 'Navsari', 'Panchmahal', 'Patan',
    'Porbandar', 'Rajkot', 'Sabarkantha', 'Surat', 'Surendranagar', 'Tapi',
    'Vadodara', 'Valsad',
  ],
  'Maharashtra': [
    'Ahmednagar', 'Akola', 'Amravati', 'Aurangabad', 'Beed', 'Bhandara', 'Buldhana',
    'Chandrapur', 'Dhule', 'Gadchiroli', 'Gondia', 'Hingoli', 'Jalgaon', 'Jalna',
    'Kolhapur', 'Latur', 'Mumbai City', 'Mumbai Suburban', 'Nagpur', 'Nanded',
    'Nandurbar', 'Nashik', 'Osmanabad', 'Palghar', 'Parbhani', 'Pune', 'Raigad',
    'Ratnagiri', 'Sangli', 'Satara', 'Sindhudurg', 'Solapur', 'Thane', 'Wardha',
    'Washim', 'Yavatmal',
  ],
  'Rajasthan': [
    'Ajmer', 'Alwar', 'Banswara', 'Baran', 'Barmer', 'Bharatpur', 'Bhilwara',
    'Bikaner', 'Bundi', 'Chittorgarh', 'Churu', 'Dausa', 'Dholpur', 'Dungarpur',
    'Ganganagar', 'Hanumangarh', 'Jaipur', 'Jaisalmer', 'Jalore', 'Jhalawar',
    'Jhunjhunu', 'Jodhpur', 'Karauli', 'Kota', 'Nagaur', 'Pali', 'Pratapgarh',
    'Rajsamand', 'Sawai Madhopur', 'Sikar', 'Sirohi', 'Tonk', 'Udaipur',
  ],
  'Uttar Pradesh': [
    'Agra', 'Aligarh', 'Ambedkar Nagar', 'Amethi', 'Amroha', 'Auraiya', 'Ayodhya',
    'Azamgarh', 'Baghpat', 'Bahraich', 'Ballia', 'Balrampur', 'Banda', 'Barabanki',
    'Bareilly', 'Basti', 'Bhadohi', 'Bijnor', 'Budaun', 'Bulandshahr', 'Chandauli',
    'Chitrakoot', 'Deoria', 'Etah', 'Etawah', 'Farrukhabad', 'Fatehpur', 'Firozabad',
    'Gautam Buddh Nagar', 'Ghaziabad', 'Ghazipur', 'Gonda', 'Gorakhpur', 'Hamirpur',
    'Hapur', 'Hardoi', 'Hathras', 'Jalaun', 'Jaunpur', 'Jhansi', 'Kannauj',
    'Kanpur Dehat', 'Kanpur Nagar', 'Kasganj', 'Kaushambi', 'Kushinagar',
    'Lakhimpur Kheri', 'Lalitpur', 'Lucknow', 'Maharajganj', 'Mahoba', 'Mainpuri',
    'Mathura', 'Mau', 'Meerut', 'Mirzapur', 'Moradabad', 'Muzaffarnagar', 'Pilibhit',
    'Pratapgarh', 'Prayagraj', 'Raebareli', 'Rampur', 'Saharanpur', 'Sambhal',
    'Sant Kabir Nagar', 'Shahjahanpur', 'Shamli', 'Shravasti', 'Siddharthnagar',
    'Sitapur', 'Sonbhadra', 'Sultanpur', 'Unnao', 'Varanasi',
  ],
  'Madhya Pradesh': [
    'Agar Malwa', 'Alirajpur', 'Anuppur', 'Ashoknagar', 'Balaghat', 'Barwani',
    'Betul', 'Bhind', 'Bhopal', 'Burhanpur', 'Chhatarpur', 'Chhindwara', 'Damoh',
    'Datia', 'Dewas', 'Dhar', 'Dindori', 'Guna', 'Gwalior', 'Harda', 'Hoshangabad',
    'Indore', 'Jabalpur', 'Jhabua', 'Katni', 'Khandwa', 'Khargone', 'Mandla',
    'Mandsaur', 'Morena', 'Narsinghpur', 'Neemuch', 'Niwari', 'Panna', 'Raisen',
    'Rajgarh', 'Ratlam', 'Rewa', 'Sagar', 'Satna', 'Sehore', 'Seoni', 'Shahdol',
    'Shajapur', 'Sheopur', 'Shivpuri', 'Sidhi', 'Singrauli', 'Tikamgarh', 'Ujjain',
    'Umaria', 'Vidisha',
  ],
  'Karnataka': [
    'Bagalkot', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban',
    'Bidar', 'Chamarajanagar', 'Chikkaballapur', 'Chikkamagaluru', 'Chitradurga',
    'Dakshina Kannada', 'Davanagere', 'Dharwad', 'Gadag', 'Hassan', 'Haveri',
    'Kalaburagi', 'Kodagu', 'Kolar', 'Koppal', 'Mandya', 'Mysuru', 'Raichur',
    'Ramanagara', 'Shivamogga', 'Tumakuru', 'Udupi', 'Uttara Kannada', 'Vijayapura',
    'Yadgir',
  ],
  'Tamil Nadu': [
    'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri',
    'Dindigul', 'Erode', 'Kallakurichi', 'Kancheepuram', 'Kanyakumari', 'Karur',
    'Krishnagiri', 'Madurai', 'Mayiladuthurai', 'Nagapattinam', 'Namakkal',
    'Nilgiris', 'Perambalur', 'Pudukkottai', 'Ramanathapuram', 'Ranipet', 'Salem',
    'Sivagangai', 'Tenkasi', 'Thanjavur', 'Theni', 'Thoothukudi', 'Tiruchirappalli',
    'Tirunelveli', 'Tirupathur', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai',
    'Tiruvarur', 'Vellore', 'Viluppuram', 'Virudhunagar',
  ],
  'West Bengal': [
    'Alipurduar', 'Bankura', 'Birbhum', 'Cooch Behar', 'Dakshin Dinajpur',
    'Darjeeling', 'Hooghly', 'Howrah', 'Jalpaiguri', 'Jhargram', 'Kalimpong',
    'Kolkata', 'Malda', 'Murshidabad', 'Nadia', 'North 24 Parganas',
    'Paschim Bardhaman', 'Paschim Medinipur', 'Purba Bardhaman', 'Purba Medinipur',
    'Purulia', 'South 24 Parganas', 'Uttar Dinajpur',
  ],
  'Andhra Pradesh': [
    'Alluri Sitharama Raju', 'Anakapalli', 'Ananthapuramu', 'Annamayya',
    'Bapatla', 'Chittoor', 'East Godavari', 'Eluru', 'Guntur', 'Kakinada',
    'Konaseema', 'Krishna', 'Kurnool', 'Nandyal', 'NTR', 'Palnadu', 'Parvathipuram Manyam',
    'Prakasam', 'Sri Potti Sriramulu Nellore', 'Sri Sathya Sai', 'Srikakulam',
    'Tirupati', 'Visakhapatnam', 'Vizianagaram', 'West Godavari', 'YSR Kadapa',
  ],
  'Telangana': [
    'Adilabad', 'Bhadradri Kothagudem', 'Hanumakonda', 'Hyderabad', 'Jagtial',
    'Jangaon', 'Jayashankar Bhupalpally', 'Jogulamba Gadwal', 'Kamareddy',
    'Karimnagar', 'Khammam', 'Kumuram Bheem', 'Mahabubabad', 'Mahabubnagar',
    'Mancherial', 'Medak', 'Medchal–Malkajgiri', 'Mulugu', 'Nagarkurnool',
    'Nalgonda', 'Narayanpet', 'Nirmal', 'Nizamabad', 'Peddapalli', 'Rajanna Sircilla',
    'Rangareddy', 'Sangareddy', 'Siddipet', 'Suryapet', 'Vikarabad', 'Wanaparthy',
    'Warangal', 'Yadadri Bhuvanagiri',
  ],
  'Delhi': [
    'Central Delhi', 'East Delhi', 'New Delhi', 'North Delhi', 'North East Delhi',
    'North West Delhi', 'Shahdara', 'South Delhi', 'South East Delhi',
    'South West Delhi', 'West Delhi',
  ],
  'Punjab': [
    'Amritsar', 'Barnala', 'Bathinda', 'Faridkot', 'Fatehgarh Sahib', 'Fazilka',
    'Ferozepur', 'Gurdaspur', 'Hoshiarpur', 'Jalandhar', 'Kapurthala', 'Ludhiana',
    'Malerkotla', 'Mansa', 'Moga', 'Mohali', 'Muktsar', 'Pathankot', 'Patiala',
    'Rupnagar', 'Sangrur', 'Shahid Bhagat Singh Nagar', 'Tarn Taran',
  ],
  'Haryana': [
    'Ambala', 'Bhiwani', 'Charkhi Dadri', 'Faridabad', 'Fatehabad', 'Gurugram',
    'Hisar', 'Jhajjar', 'Jind', 'Kaithal', 'Karnal', 'Kurukshetra', 'Mahendragarh',
    'Nuh', 'Palwal', 'Panchkula', 'Panipat', 'Rewari', 'Rohtak', 'Sirsa', 'Sonipat',
    'Yamunanagar',
  ],
  'Bihar': [
    'Araria', 'Arwal', 'Aurangabad', 'Banka', 'Begusarai', 'Bhagalpur', 'Bhojpur',
    'Buxar', 'Darbhanga', 'East Champaran', 'Gaya', 'Gopalganj', 'Jamui', 'Jehanabad',
    'Kaimur', 'Katihar', 'Khagaria', 'Kishanganj', 'Lakhisarai', 'Madhepura',
    'Madhubani', 'Munger', 'Muzaffarpur', 'Nalanda', 'Nawada', 'Patna', 'Purnia',
    'Rohtas', 'Saharsa', 'Samastipur', 'Saran', 'Sheikhpura', 'Sheohar',
    'Sitamarhi', 'Siwan', 'Supaul', 'Vaishali', 'West Champaran',
  ],
  'Odisha': [
    'Angul', 'Balangir', 'Balasore', 'Bargarh', 'Bhadrak', 'Boudh', 'Cuttack',
    'Deogarh', 'Dhenkanal', 'Gajapati', 'Ganjam', 'Jagatsinghpur', 'Jajpur',
    'Jharsuguda', 'Kalahandi', 'Kandhamal', 'Kendrapara', 'Kendujhar', 'Khordha',
    'Koraput', 'Malkangiri', 'Mayurbhanj', 'Nabarangpur', 'Nayagarh', 'Nuapada',
    'Puri', 'Rayagada', 'Sambalpur', 'Subarnapur', 'Sundargarh',
  ],
  'Kerala': [
    'Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod', 'Kollam',
    'Kottayam', 'Kozhikode', 'Malappuram', 'Palakkad', 'Pathanamthitta',
    'Thiruvananthapuram', 'Thrissur', 'Wayanad',
  ],
  'Assam': [
    'Bajali', 'Baksa', 'Barpeta', 'Biswanath', 'Bongaigaon', 'Cachar', 'Charaideo',
    'Chirang', 'Darrang', 'Dhemaji', 'Dhubri', 'Dibrugarh', 'Dima Hasao',
    'Goalpara', 'Golaghat', 'Hailakandi', 'Hojai', 'Jorhat', 'Kamrup',
    'Kamrup Metropolitan', 'Karbi Anglong', 'Karimganj', 'Kokrajhar', 'Lakhimpur',
    'Majuli', 'Morigaon', 'Nagaon', 'Nalbari', 'Sivasagar', 'Sonitpur', 'South Salmara-Mankachar',
    'Tinsukia', 'Udalguri', 'West Karbi Anglong',
  ],
  'Chhattisgarh': [
    'Balod', 'Baloda Bazar', 'Balrampur', 'Bastar', 'Bemetara', 'Bijapur',
    'Bilaspur', 'Dantewada', 'Dhamtari', 'Durg', 'Gariyaband', 'Gaurela-Pendra-Marwahi',
    'Janjgir-Champa', 'Jashpur', 'Kabirdham', 'Kanker', 'Khairagarh', 'Kondagaon',
    'Korba', 'Korea', 'Mahasamund', 'Manendragarh', 'Mohla-Manpur', 'Mungeli',
    'Narayanpur', 'Raigarh', 'Raipur', 'Rajnandgaon', 'Sakti', 'Sarangarh-Bilaigarh',
    'Sukma', 'Surajpur', 'Surguja',
  ],
  'Jharkhand': [
    'Bokaro', 'Chatra', 'Deoghar', 'Dhanbad', 'Dumka', 'East Singhbhum', 'Garhwa',
    'Giridih', 'Godda', 'Gumla', 'Hazaribagh', 'Jamtara', 'Khunti', 'Koderma',
    'Latehar', 'Lohardaga', 'Pakur', 'Palamu', 'Ramgarh', 'Ranchi', 'Sahebganj',
    'Seraikela Kharsawan', 'Simdega', 'West Singhbhum',
  ],
  'Himachal Pradesh': [
    'Bilaspur', 'Chamba', 'Hamirpur', 'Kangra', 'Kinnaur', 'Kullu', 'Lahaul and Spiti',
    'Mandi', 'Shimla', 'Sirmaur', 'Solan', 'Una',
  ],
  'Uttarakhand': [
    'Almora', 'Bageshwar', 'Chamoli', 'Champawat', 'Dehradun', 'Haridwar',
    'Nainital', 'Pauri Garhwal', 'Pithoragarh', 'Rudraprayag', 'Tehri Garhwal',
    'Udham Singh Nagar', 'Uttarkashi',
  ],
  'Goa': ['North Goa', 'South Goa'],
  'Manipur': [
    'Bishnupur', 'Chandel', 'Churachandpur', 'Imphal East', 'Imphal West',
    'Jiribam', 'Kakching', 'Kamjong', 'Kangpokpi', 'Noney', 'Pherzawl',
    'Senapati', 'Tamenglong', 'Tengnoupal', 'Thoubal', 'Ukhrul',
  ],
  'Meghalaya': [
    'East Garo Hills', 'East Jaintia Hills', 'East Khasi Hills', 'Eastern West Khasi Hills',
    'North Garo Hills', 'Ri Bhoi', 'South Garo Hills', 'South West Garo Hills',
    'South West Khasi Hills', 'West Garo Hills', 'West Jaintia Hills', 'West Khasi Hills',
  ],
  'Arunachal Pradesh': [
    'Anjaw', 'Changlang', 'Dibang Valley', 'East Kameng', 'East Siang', 'Itanagar Capital Complex',
    'Kamle', 'Kra Daadi', 'Kurung Kumey', 'Lepa Rada', 'Lohit', 'Longding',
    'Lower Dibang Valley', 'Lower Siang', 'Lower Subansiri', 'Namsai', 'Pakke-Kessang',
    'Papum Pare', 'Shi Yomi', 'Siang', 'Tawang', 'Tirap', 'Upper Dibang Valley',
    'Upper Siang', 'Upper Subansiri', 'West Kameng', 'West Siang',
  ],
  'Nagaland': [
    'Chumoukedima', 'Dimapur', 'Kiphire', 'Kohima', 'Longleng', 'Mokokchung',
    'Mon', 'Niuland', 'Noklak', 'Peren', 'Phek', 'Shamator', 'Tseminyü',
    'Tuensang', 'Wokha', 'Zunheboto',
  ],
  'Mizoram': [
    'Aizawl', 'Champhai', 'Hnahthial', 'Khawzawl', 'Kolasib', 'Lawngtlai',
    'Lunglei', 'Mamit', 'Saiha', 'Saitual', 'Serchhip',
  ],
  'Tripura': [
    'Dhalai', 'Gomati', 'Khowai', 'North Tripura', 'Sepahijala', 'South Tripura',
    'Unakoti', 'West Tripura',
  ],
  'Sikkim': ['East Sikkim', 'North Sikkim', 'Pakyong', 'Soreng', 'South Sikkim', 'West Sikkim'],
  'Jammu and Kashmir': [
    'Anantnag', 'Bandipora', 'Baramulla', 'Budgam', 'Doda', 'Ganderbal',
    'Jammu', 'Kathua', 'Kishtwar', 'Kulgam', 'Kupwara', 'Poonch', 'Pulwama',
    'Rajouri', 'Ramban', 'Reasi', 'Samba', 'Shopian', 'Srinagar', 'Udhampur',
  ],
  'Ladakh': ['Kargil', 'Leh'],
  'Puducherry': ['Karaikal', 'Mahe', 'Puducherry', 'Yanam'],
  'Chandigarh': ['Chandigarh'],
  'Andaman and Nicobar Islands': ['Nicobar', 'North and Middle Andaman', 'South Andaman'],
  'Dadra and Nagar Haveli and Daman and Diu': ['Dadra and Nagar Haveli', 'Daman', 'Diu'],
  'Lakshadweep': ['Lakshadweep'],
};
const NAME_REGEX = /^[a-zA-Z\u00C0-\u024F][a-zA-Z\u00C0-\u024F\s.''\-]{0,99}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[\d][\d\s\-]{4,18}$/;

function validatePhone(value) {
  const v = (value || '').trim();
  if (!v) return '';
  if (!PHONE_REGEX.test(v))
    return 'Enter a valid phone / landline number (digits, spaces, hyphens, optional + prefix)';
  const digits = v.replace(/\D/g, '');
  if (digits.length < 6) return `Too short — only ${digits.length} digit${digits.length === 1 ? '' : 's'} entered (minimum 6)`;
  if (digits.length > 15) return `Too long — ${digits.length} digits entered (maximum 15)`;
  return '';
}

const FIELDS = [
  { key: 'ownerName', label: 'Owner Name', icon: UserCircle, placeholder: 'e.g. Rajesh Mehta', col: 6, required: true, type: 'text' },
  { key: 'alternateContactName', label: 'Alternate Contact Name', icon: Users, placeholder: 'e.g. R. Mehta', col: 6, required: false, type: 'name' },
  { key: 'ownerAddress', label: 'Owner Address', icon: Home, placeholder: 'Street / Area', col: 12, required: false, type: 'text' },
  { key: 'phone1', label: 'Phone 1', icon: Phone, placeholder: '+91 98765 43210 or 079-27650000', col: 6, required: true, type: 'phone' },
  { key: 'phone2', label: 'Phone 2', icon: Phone, placeholder: '+91 79001 12233 or 0265-2xxxxxx', col: 6, required: false, type: 'phone' },
  { key: 'city', label: 'City', icon: Building2, placeholder: 'e.g. Ahmedabad', col: 6, required: true, type: 'text' },
  { key: 'state', label: 'State', icon: MapPin, placeholder: '', col: 6, required: true, type: 'combo-state' },
  { key: 'district', label: 'District', icon: MapPin, placeholder: '', col: 6, required: true, type: 'combo-district' },
  { key: 'country', label: 'Country', icon: Globe, placeholder: 'India', col: 6, required: true, type: 'readonly' },
  { key: 'emailAddress', label: 'Email Address', icon: Mail, placeholder: 'example@email.com', col: 12, required: false, type: 'email' },
];

const PAGE_SIZE_OPTIONS = [10, 12, 15, 20];

function validateField(key, value, type, required) {
  const v = (value || '').trim();
  if (required && !v) return 'This field is required';
  if (!v) return '';
  if (type === 'name') { if (!NAME_REGEX.test(v)) return "Only letters, spaces, and . ' - are allowed"; }
  if (type === 'phone') return validatePhone(v);
  if (type === 'email') { if (!EMAIL_REGEX.test(v)) return 'Enter a valid email address'; }
  return '';
}
/* ═══════════════════════════════════════════
   STATE COMBO
═══════════════════════════════════════════ */
function StateCombo({ value, onChange, onBlur, hasError }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [wasOpened, setWasOpened] = useState(false);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const filtered = INDIA_STATES.filter(s =>
    s.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
        if (wasOpened) { onBlur?.(); setWasOpened(false); }
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onBlur, wasOpened]);

  const openDropdown = () => {
    setOpen(true); setWasOpened(true); setQuery('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const select = (state) => { onChange(state); setOpen(false); setQuery(''); setWasOpened(false); };

  const clear = (e) => {
    e.stopPropagation();
    onChange(''); setOpen(false); setQuery(''); setWasOpened(false); onBlur?.();
  };

  const handleTriggerKeyDown = (e) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDropdown(); }
      return;
    }
    const items = listRef.current?.querySelectorAll('.pg-combo-option');
    const idx = Array.from(items || []).indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); (items[idx + 1] || items[0])?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); (items[idx - 1] || items[items.length - 1])?.focus(); }
    else if (e.key === 'Escape') { setOpen(false); setQuery(''); onBlur?.(); setWasOpened(false); }
  };

  const handleSearchKeyDown = (e) => {
    const items = listRef.current?.querySelectorAll('.pg-combo-option');
    if (e.key === 'ArrowDown') { e.preventDefault(); items?.[0]?.focus(); }
    else if (e.key === 'Escape') { setOpen(false); setQuery(''); onBlur?.(); setWasOpened(false); }
  };

  const handleOptionKeyDown = (e, opt) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(opt); }
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const items = listRef.current?.querySelectorAll('.pg-combo-option');
      const idx = Array.from(items).indexOf(e.currentTarget);
      (items[idx + 1] || items[0])?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const items = listRef.current?.querySelectorAll('.pg-combo-option');
      const idx = Array.from(items).indexOf(e.currentTarget);
      (items[idx - 1] || items[items.length - 1])?.focus();
    } else if (e.key === 'Escape') { setOpen(false); setQuery(''); onBlur?.(); setWasOpened(false); }
  };

  return (
    <div className="pg-combo-wrap" ref={wrapRef}>
      <div
        className={`pg-field-wrap pg-combo-trigger ${hasError ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`}
        onClick={openDropdown} tabIndex={0} onKeyDown={handleTriggerKeyDown}
      >
        <MapPin size={14} color={hasError ? '#ef4444' : '#c0c0d8'} style={{ flexShrink: 0 }} />
        <span className={`pg-combo-display${!value ? ' pg-combo-display--placeholder' : ''}`}>
          {value || 'Select state…'}
        </span>
        {value
          ? <X size={13} className="pg-combo-clear" onClick={clear} />
          : <ChevronDown size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />}
      </div>

      {open && (
        <div className="pg-combo-panel">
          <div className="pg-combo-search">
            <Search size={12} color="#c0c0d8" style={{ flexShrink: 0 }} />
            <input
              ref={inputRef}
              className="pg-combo-search__input"
              placeholder="Search state…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            {query && <X size={11} className="pg-combo-clear" onClick={() => setQuery('')} />}
          </div>
          <div className="pg-combo-list" ref={listRef}>
            {filtered.length === 0 ? (
              <div className="pg-combo-empty">No states match</div>
            ) : filtered.map(s => (
              <div
                key={s}
                className={`pg-combo-option${s === value ? ' pg-combo-option--active' : ''}`}
                onClick={() => select(s)} tabIndex={0}
                onKeyDown={e => handleOptionKeyDown(e, s)}
              >
                <span className="pg-combo-option__name">{s}</span>
                {s === value && <Check size={12} color="#049edf" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   DISTRICT COMBO  (depends on state)
═══════════════════════════════════════════ */
function DistrictCombo({ value, onChange, onBlur, hasError, stateValue }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [wasOpened, setWasOpened] = useState(false);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const options = stateValue ? (DISTRICTS_BY_STATE[stateValue] || []) : [];
  const disabled = !stateValue;

  const filtered = options.filter(d =>
    d.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
        if (wasOpened) { onBlur?.(); setWasOpened(false); }
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onBlur, wasOpened]);

  const openDropdown = () => {
    if (disabled) return;
    setOpen(true); setWasOpened(true); setQuery('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const select = (district) => { onChange(district); setOpen(false); setQuery(''); setWasOpened(false); };

  const clear = (e) => {
    e.stopPropagation();
    onChange(''); setOpen(false); setQuery(''); setWasOpened(false); onBlur?.();
  };

  const handleTriggerKeyDown = (e) => {
    if (disabled) return;
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDropdown(); }
      return;
    }
    const items = listRef.current?.querySelectorAll('.pg-combo-option');
    const idx = Array.from(items || []).indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); (items[idx + 1] || items[0])?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); (items[idx - 1] || items[items.length - 1])?.focus(); }
    else if (e.key === 'Escape') { setOpen(false); setQuery(''); onBlur?.(); setWasOpened(false); }
  };

  const handleSearchKeyDown = (e) => {
    const items = listRef.current?.querySelectorAll('.pg-combo-option');
    if (e.key === 'ArrowDown') { e.preventDefault(); items?.[0]?.focus(); }
    else if (e.key === 'Escape') { setOpen(false); setQuery(''); onBlur?.(); setWasOpened(false); }
  };

  const handleOptionKeyDown = (e, opt) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(opt); }
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const items = listRef.current?.querySelectorAll('.pg-combo-option');
      const idx = Array.from(items).indexOf(e.currentTarget);
      (items[idx + 1] || items[0])?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const items = listRef.current?.querySelectorAll('.pg-combo-option');
      const idx = Array.from(items).indexOf(e.currentTarget);
      (items[idx - 1] || items[items.length - 1])?.focus();
    } else if (e.key === 'Escape') { setOpen(false); setQuery(''); onBlur?.(); setWasOpened(false); }
  };

  return (
    <div className="pg-combo-wrap" ref={wrapRef}>
      <div
        className={`pg-field-wrap pg-combo-trigger ${disabled ? 'pg-field-wrap--readonly' :
            hasError ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'
          }`}
        onClick={openDropdown}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleTriggerKeyDown}
        style={disabled ? { cursor: 'not-allowed', opacity: 0.6 } : {}}
      >
        <MapPin size={14} color={hasError ? '#ef4444' : disabled ? '#049edf' : '#c0c0d8'} style={{ flexShrink: 0 }} />
        <span className={`pg-combo-display${!value ? ' pg-combo-display--placeholder' : ''}`}>
          {disabled ? 'Select a state first…' : value || 'Select district…'}
        </span>
        {value && !disabled
          ? <X size={13} className="pg-combo-clear" onClick={clear} />
          : <ChevronDown size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />}
      </div>

      {open && !disabled && (
        <div className="pg-combo-panel">
          <div className="pg-combo-search">
            <Search size={12} color="#c0c0d8" style={{ flexShrink: 0 }} />
            <input
              ref={inputRef}
              className="pg-combo-search__input"
              placeholder="Search district…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            {query && <X size={11} className="pg-combo-clear" onClick={() => setQuery('')} />}
          </div>
          <div className="pg-combo-list" ref={listRef}>
            {options.length === 0 ? (
              <div className="pg-combo-empty">No districts available for this state</div>
            ) : filtered.length === 0 ? (
              <div className="pg-combo-empty">No districts match</div>
            ) : filtered.map(d => (
              <div
                key={d}
                className={`pg-combo-option${d === value ? ' pg-combo-option--active' : ''}`}
                onClick={() => select(d)} tabIndex={0}
                onKeyDown={e => handleOptionKeyDown(e, d)}
              >
                <span className="pg-combo-option__name">{d}</span>
                {d === value && <Check size={12} color="#049edf" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
/* ─────────────────────────────────────────
   normalizeOwner
   Confirmed from Swagger: API returns
   ownerID (capital ID), ownerName,
   alternateContactName, ownerAddress,
   phone1, phone2, city, district,
   state, country, emailAddress
───────────────────────────────────────── */
function normalizeOwner(raw) {

  // Swagger confirms the PK field is "ownerID"
  const id =
    raw.ownerID ??   // ← confirmed from Swagger screenshot
    raw.ownerId ??   // fallback camelCase variant
    raw.OwnerId ??
    raw.owner_id ??
    raw.id ??
    raw.Id ??
    null;

  if (id === null || id === undefined) {
    const fallback = Object.entries(raw).find(
      ([k, v]) =>
        (typeof v === 'number' || (typeof v === 'string' && /^\d+$/.test(v))) &&
        k.toLowerCase().includes('id')
    );
    if (fallback) {
      console.warn(`normalizeOwner: used fallback ID field "${fallback[0]}" = ${fallback[1]}`);
    }
    return buildOwner(fallback ? fallback[1] : undefined, raw);
  }

  return buildOwner(id, raw);
}

function buildOwner(id, raw) {
  return {
    _id: id,
    ownerName: raw.ownerName ?? raw.OwnerName ?? '',
    alternateContactName: raw.alternateContactName ?? raw.AlternateContactName ?? '',
    ownerAddress: raw.ownerAddress ?? raw.OwnerAddress ?? '',
    phone1: raw.phone1 ?? raw.Phone1 ?? '',
    phone2: raw.phone2 ?? raw.Phone2 ?? '',
    city: raw.city ?? raw.City ?? '',
    district: raw.district ?? raw.District ?? '',
    state: raw.state ?? raw.State ?? '',
    country: raw.country ?? raw.Country ?? 'India',
    emailAddress: raw.emailAddress ?? raw.EmailAddress ?? '',
  };
}

/* ─────────────────────────────────────────
   toPayload
   Sends plain camelCase keys — confirmed
   working from Swagger (ownerName, phone1…)
   The ownerID in PUT body is handled inside
   apiService.updateOwner in api.js
───────────────────────────────────────── */
function toPayload(form) {
  return {
    ownerName: form.ownerName.trim(),
    alternateContactName: form.alternateContactName.trim(),
    ownerAddress: form.ownerAddress.trim(),
    phone1: form.phone1.trim(),
    phone2: form.phone2.trim(),
    city: form.city.trim(),
    district: form.district.trim(),
    state: form.state.trim(),
    country: form.country.trim(),
    emailAddress: form.emailAddress.trim(),
  };
}

/* ─────────────────────────────────────────
   SORT ICON
───────────────────────────────────────── */
function SortIcon({ col, sortKey, sortDir }) {
  const active = sortKey === col;
  return (
    <span className="pg-sort-icon">
      <ChevronUp size={10} color={active && sortDir === 'asc' ? '#049edf' : '#c0c0d8'} className="pg-sort-icon__up" />
      <ChevronDown size={10} color={active && sortDir === 'desc' ? '#049edf' : '#c0c0d8'} className="pg-sort-icon__down" />
    </span>
  );
}

/* ═══════════════════════════════════════════
   VIEW MODAL
═══════════════════════════════════════════ */
function ViewModal({ owner, onClose, onEdit }) {
  if (!owner) return null;

  const InfoRow = ({ icon: Icon, label, value, highlight }) =>
    value ? (
      <div className="pg-info-row">
        <div className={`pg-info-row__icon${highlight ? ' pg-info-row__icon--highlight' : ''}`}>
          <Icon size={14} color={highlight ? '#049edf' : '#a0a0c0'} />
        </div>
        <div className="pg-info-row__content">
          <div className="pg-info-row__label">{label}</div>
          <div className={`pg-info-row__value${highlight ? ' pg-info-row__value--highlight' : ''}`}>{value}</div>
        </div>
      </div>
    ) : null;

  return (
    <div className="pg-overlay pg-overlay--view" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pg-modal pg-modal--view">
        <div className="pg-view__banner">
          <button className="pg-view__close" onClick={onClose}><X size={15} /></button>
          <div className="pg-view__banner-content">
            <div className="pg-view__avatar"><UserCircle size={30} color="#fff" /></div>
            <div>
              <h4 className="pg-view__name">{owner.ownerName}</h4>
              {owner.alternateContactName && (
                <span className="pg-view__aka">Also known as: {owner.alternateContactName}</span>
              )}
            </div>
          </div>
          <div className="pg-view__pill">
            <MapPin size={11} color="rgba(255,255,255,0.85)" />
            <span className="pg-view__pill-text">
              {[owner.city, owner.district !== owner.city ? owner.district : null, owner.state, owner.country].filter(Boolean).join(', ')}
            </span>
          </div>
        </div>

        <div className="pg-view__body">
          <div className="pg-view__section-label">Contact</div>
          <InfoRow icon={Phone} label="Phone 1" value={owner.phone1} highlight />
          <InfoRow icon={Phone} label="Phone 2" value={owner.phone2} />
          <InfoRow icon={Mail} label="Email Address" value={owner.emailAddress} highlight />
          <div className="pg-view__section-label pg-view__section-label--mt">Address</div>
          <InfoRow icon={Home} label="Street / Area" value={owner.ownerAddress} />
          <InfoRow icon={Building2} label="City" value={owner.city} />
          <InfoRow icon={MapPin} label="District" value={owner.district} />
          <InfoRow icon={MapPin} label="State" value={owner.state} />
          <InfoRow icon={Globe} label="Country" value={owner.country} />
        </div>

        <div className="pg-view__foot">
          <button className="pg-btn-cancel" onClick={onClose}>Close</button>
          <button className="pg-view__btn-edit" onClick={() => { onClose(); onEdit(owner); }}>
            <Edit2 size={13} /> Edit Owner
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ADD / EDIT MODAL
═══════════════════════════════════════════ */
function OwnerModal({ onClose, onSaved, editData }) {
  const isEdit = !!editData;
  const [form, setForm] = useState(isEdit ? { ...editData } : { ...EMPTY_FORM });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState('');

  const runValidate = (f) => {
    const e = {};
    FIELDS.forEach(({ key, required, type }) => {
      if (type === 'readonly') return;
      const err = validateField(key, f[key], type, required);
      if (err) e[key] = err;
    });
    return e;
  };

  const handleChange = (key, val) => {
    const updated = { ...form, [key]: val };
    if (key === 'state') updated.district = '';
    setForm(updated);
    if (touched[key]) {
      const field = FIELDS.find(f => f.key === key);
      const err = validateField(key, val, field.type, field.required);
      setErrors(p => ({ ...p, [key]: err }));
      if (key === 'state') setErrors(p => ({ ...p, district: '' }));
    }
  };

  const handleComboBlur = (key) => {
    setTouched(p => ({ ...p, [key]: true }));
    const field = FIELDS.find(f => f.key === key);
    const err = validateField(key, form[key], field.type, field.required);
    setErrors(p => ({ ...p, [key]: err }));
  };

  const handleBlur = (key) => {
    setTouched(p => ({ ...p, [key]: true }));
    const field = FIELDS.find(f => f.key === key);
    const err = validateField(key, form[key], field.type, field.required);
    setErrors(p => ({ ...p, [key]: err }));
  };

  const handleSubmit = async () => {
    const allTouched = {};
    FIELDS.forEach(f => { allTouched[f.key] = true; });
    setTouched(allTouched);

    const e = runValidate(form);
    if (Object.keys(e).length) { setErrors(e); return; }

    if (isEdit && (editData._id === undefined || editData._id === null)) {
      setApiError(
        'Owner ID is missing — cannot update. ' +
        'Open browser console and check "Owner raw from API:" to see the exact ID field name.'
      );
      return;
    }

    setSubmitting(true);
    setApiError('');

    try {
      const payload = toPayload(form);
      let saved;

      if (isEdit) {
        const response = await apiService.updateOwner(editData._id, payload);
        const raw = response?.data ?? response;
        saved = (raw && typeof raw === 'object' && (raw.ownerID ?? raw.ownerId ?? raw.id))
          ? normalizeOwner(raw)
          : { ...editData, ...form };
      } else {
        const response = await apiService.createOwner(payload);
        const raw = response?.data ?? response;
        saved = normalizeOwner(raw);
      }

      setSuccess(true);
      await new Promise(r => setTimeout(r, 700));
      onSaved(saved, isEdit);
      onClose();

    } catch (err) {
      console.error('Save owner error:', err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        err?.response?.data ||
        err?.message ||
        'Something went wrong. Please try again.';
      setApiError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSubmitting(false);
    }
  };

  return ReactDOM.createPortal(
    // <div className="pg-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="pg-overlay">
      <div className="pg-modal">

        {/* Header */}
        <div className="pg-modal__head">
          <div className="pg-modal__head-left">
            <div className="pg-modal__icon-wrap"><UserCircle size={20} color="#049edf" /></div>
            <div>
              <h5 className="pg-modal__title">{isEdit ? 'Edit Owner' : 'Add New Owner'}</h5>
              <p className="pg-modal__subtitle">{isEdit ? `Editing: ${editData.ownerName}` : 'Fill in the details below'}</p>
            </div>
          </div>
          <button className="pg-modal__close" onClick={onClose}><X size={15} /></button>
        </div>

        {/* API error banner */}
        {apiError && (
          <div style={{ margin: '0 24px 4px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 11, color: '#dc2626', fontSize: 12.5, fontWeight: 600, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{apiError}</span>
          </div>
        )}

        {/* Form */}
        <div className="pg-modal__body">
          <div className="row g-3">
            {FIELDS.map(({ key, label, icon: Icon, placeholder, col, required, type }) => {
              const isReadonly = type === 'readonly';
              const isComboState = type === 'combo-state';
              const isComboDistrict = type === 'combo-district';
              const hasError = !!errors[key];
              const wrapClass = `pg-field-wrap ${isReadonly ? 'pg-field-wrap--readonly' : hasError ? 'pg-field-wrap--error' : 'pg-field-wrap--normal'}`;

              return (
                <div key={key} className={`col-12 col-sm-${col}`}>
                  <label className="pg-field-label">
                    {label}{' '}
                    {isReadonly
                      ? <span className="pg-field-label__fixed">🔒 Fixed</span>
                      : required
                        ? <span className="pg-field-label__required">*</span>
                        : <span className="pg-field-label__optional">(optional)</span>}
                  </label>

                  {isComboState ? (
                    <StateCombo
                      value={form.state ?? ''}
                      onChange={val => handleChange('state', val)}
                      onBlur={() => handleComboBlur('state')}
                      hasError={hasError}
                    />
                  ) : isComboDistrict ? (
                    <DistrictCombo
                      value={form.district ?? ''}
                      onChange={val => handleChange('district', val)}
                      onBlur={() => handleComboBlur('district')}
                      hasError={hasError}
                      stateValue={form.state}
                    />
                  ) : (
                    <div className={wrapClass}>
                      <Icon size={14} color={hasError ? '#ef4444' : isReadonly ? '#049edf' : '#c0c0d8'} style={{ flexShrink: 0 }} />
                      <input
                        readOnly={isReadonly}
                        placeholder={placeholder}
                        value={form[key] ?? ''}
                        onChange={e => !isReadonly && handleChange(key, e.target.value)}
                        onBlur={() => !isReadonly && handleBlur(key)}
                        className={`pg-field-input${isReadonly ? ' pg-field-input--readonly' : ''}`}
                      />
                    </div>
                  )}

                  {hasError && (
                    <div className="pg-field-error">
                      <AlertCircle size={11} style={{ flexShrink: 0, marginTop: '1px' }} />
                      <span>{errors[key]}</span>
                    </div>
                  )}
                  {type === 'phone' && !hasError && touched[key] && (
                    <div className="pg-field-hint">
                      Mobile: +91 98765 43210 &nbsp;|&nbsp; Landline: 079-27650000
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="pg-form__note">
            <span className="pg-field-label__required">*</span> Required fields &nbsp;·&nbsp; Fields marked optional may be left blank
          </p>
        </div>

        {/* Footer */}
        <div className="pg-modal__foot">
          <button className="pg-btn-cancel" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="pg-btn-save" onClick={handleSubmit} disabled={submitting}>
            {success
              ? <><Check size={14} /> {isEdit ? 'Saved!' : 'Added!'}</>
              : submitting
                ? <><RefreshCw size={13} className="pg-spin" /> Saving…</>
                : <><Plus size={14} /> {isEdit ? 'Save Changes' : 'Add Owner'}</>}
          </button>
        </div>

      </div>
    </div>,
    document.body   // ← escapes sidebar stacking context
  );
}

/* ─── Mobile Card ─── */
function OwnerCard({ o, onEdit, onView }) {
  return (
    <div className="pg-card">
      <div className="pg-card__header">
        <div className="pg-card__title-wrap">
          <div className="pg-card__title">{o.ownerName}</div>
          {o.alternateContactName && (
            <div className="pg-card__subtitle">{o.alternateContactName}</div>
          )}
        </div>
        <div className="pg-card__actions">
          <button className="pg-card__btn-edit" onClick={() => onEdit(o)} title="Edit"><Edit2 size={13} /></button>
          <button className="pg-card__btn-view" onClick={() => onView(o)} title="View"><Eye size={13} /></button>
        </div>
      </div>
      <div className="pg-card__body">
        {o.ownerAddress && (
          <div className="pg-card__row">
            <Home size={13} className="pg-card__row-icon" />
            <span className="pg-card__row-text">{o.ownerAddress}</span>
          </div>
        )}
        <div className="pg-card__grid2">
          <div className="pg-card__grid-cell">
            <Phone size={12} color="#c0c0d8" style={{ flexShrink: 0 }} />
            <span className="pg-card__grid-text">{o.phone1}</span>
          </div>
          {o.phone2 && (
            <div className="pg-card__grid-cell pg-card__grid-cell--muted">
              <Phone size={12} color="#c0c0d8" style={{ flexShrink: 0 }} />
              <span className="pg-card__grid-text">{o.phone2}</span>
            </div>
          )}
        </div>
        <div className="pg-card__row">
          <Building2 size={12} color="#c0c0d8" className="pg-card__row-icon" />
          <span className="pg-card__row-text">{o.city || '—'}</span>
        </div>
        {o.district && o.district !== o.city && (
          <div className="pg-card__row">
            <MapPin size={12} color="#c0c0d8" className="pg-card__row-icon" />
            <span className="pg-card__row-text">{o.district}</span>
          </div>
        )}
        {o.state && (
          <div className="pg-card__row">
            <MapPin size={12} color="#c0c0d8" className="pg-card__row-icon" />
            <span className="pg-card__row-text">{o.state}</span>
          </div>
        )}
        {o.emailAddress && (
          <div className="pg-card__row">
            <Mail size={12} color="#c0c0d8" className="pg-card__row-icon" />
            <span className="pg-card__row-text--ellipsis">{o.emailAddress}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   OWNER PAGE
═══════════════════════════════════════════ */
export default function OwnerPage() {
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editOwner, setEditOwner] = useState(null);
  const [viewOwner, setViewOwner] = useState(null);

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('ownerName');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const tableRef = useRef(null);
  const [tableReady, setTableReady] = useState(false);
  useEffect(() => { if (!loading) setTableReady(true); }, [loading]);
  useResizableColumns(tableRef, tableReady, [150, 150, 120, 110, 90, 90, 90, 120, 80]);

  /* ── Fetch all owners ── */
  const fetchOwners = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const response = await apiService.getAllOwners();
      const list = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : [];
      setOwners(list.map(normalizeOwner));
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to load owners. Please try again.';
      setFetchError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOwners(); }, [fetchOwners]);

  /* ── Search across all visible fields ── */
  const filtered = owners.filter(o => {
    const q = search.toLowerCase();
    return (
      (o.ownerName || '').toLowerCase().includes(q) ||
      (o.alternateContactName || '').toLowerCase().includes(q) ||
      (o.city || '').toLowerCase().includes(q) ||
      (o.district || '').toLowerCase().includes(q) ||
      (o.state || '').toLowerCase().includes(q) ||
      (o.phone1 || '').includes(search) ||
      (o.emailAddress || '').toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    const av = (a[sortKey] || '').toString().toLowerCase();
    const bv = (b[sortKey] || '').toString().toLowerCase();
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  /* ── Handlers ── */
  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const handleSaved = (saved, isEdit) => {
    if (isEdit) {
      setOwners(prev => prev.map(x => x._id === saved._id ? saved : x));
    } else {
      setOwners(prev => [...prev, saved]);
      setPage(1);
    }
  };

  const handleEdit = (o) => {
    setEditOwner({ ...o });   // spread so modal gets a fresh copy
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditOwner(null); };
  const handleView = (o) => setViewOwner(o);
  const closeView = () => setViewOwner(null);

  /* ── Table columns ── */
  const COLS = [
    { key: 'ownerName', label: 'Owner Name', w: '15%' },
    { key: 'ownerAddress', label: 'Address', w: '15%' },
    { key: 'phone1', label: 'Phone 1', w: '12%' },
    { key: 'phone2', label: 'Phone 2', w: '11%' },
    { key: 'city', label: 'City', w: '9%' },
    { key: 'district', label: 'District', w: '9%' },
    { key: 'state', label: 'State', w: '9%' },
    { key: 'emailAddress', label: 'Email', w: '12%' },
    { key: '_action', label: 'Action', w: '8%', noSort: true },
  ];

  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, i, arr) => {
      if (i > 0 && arr[i] - arr[i - 1] > 1) acc.push('…');
      acc.push(p);
      return acc;
    }, []);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="pg-page">
        <div className="pg-loader">
          <Loader2 size={32} color="#049edf" className="pg-spin" />
          <span className="pg-loader__text">Loading owners…</span>
        </div>
      </div>
    );
  }

  /* ── Fetch error ── */
  if (fetchError) {
    return (
      <div className="pg-page">
        <div className="pg-fetch-error">
          <AlertCircle size={28} color="#ef4444" />
          <span className="pg-fetch-error__msg">{fetchError}</span>
          <button className="pg-btn-add" onClick={fetchOwners}>
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="pg-page">

        {/* Page Header */}
        <div className="pg-header">
          <div>
            <h1 className="pg-header__title">Land Lords</h1>
            <p className="pg-header__subtitle">
              Manage all hoarding &amp; site <strong>Land Lords</strong> in one place.
            </p>
          </div>
          <button className="pg-btn-add" onClick={() => { setEditOwner(null); setShowModal(true); }}>
            <Plus size={14} /> Add New Owner
          </button>
        </div>

        {/* Container */}
        <div className="pg-container">

          {/* Toolbar */}
          <div className="pg-toolbar">
            <div className="pg-toolbar__inner">
              <div className="pg-toolbar__count">
                <Users size={14} color="#9090a8" />
                <span><strong>{filtered.length}</strong> owner{filtered.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="pg-search-box">
                <Search size={13} color="#c0c0d8" style={{ flexShrink: 0 }} />
                <input
                  placeholder="Search by name, city, district, state, phone, email…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                />
                {search && <X size={12} className="pg-search-clear" onClick={() => setSearch('')} />}
              </div>
              <button className="pg-pg-btn" onClick={fetchOwners} title="Refresh list" style={{ marginLeft: 'auto' }}>
                <RefreshCw size={13} />
              </button>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="pg-desktop-table">
            <table className="pg-table" ref={tableRef}>
              <thead>
                <tr>
                  {COLS.map(col => (
                    <th
                      key={col.key}
                      style={{ width: col.w }}
                      className={['pg-th', col.noSort ? '' : 'pg-th--sort'].filter(Boolean).join(' ')}
                      onClick={() => !col.noSort && handleSort(col.key)}
                    >
                      <div className="pg-th__inner">
                        {col.label}
                        {!col.noSort
                          ? <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />
                          : <Filter size={10} color="#d0d0e4" style={{ marginLeft: '5px' }} />}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={COLS.length} className="pg-td pg-empty" style={{ maxWidth: 'none' }}>
                      <div className="pg-empty__inner">
                        <UserCircle size={36} color="#d0d0e8" />
                        <span className="pg-empty__label">No owners found</span>
                      </div>
                    </td>
                  </tr>
                ) : paginated.map(o => (
                  <tr key={o._id} className="pg-tr">

                    {/* Owner Name + Alternate */}
                    <td className="pg-td pg-td--overflow">
                      <div className="pg-td__primary">{o.ownerName || '—'}</div>
                      {o.alternateContactName && (
                        <div className="pg-td__secondary">{o.alternateContactName}</div>
                      )}
                    </td>

                    {/* Address */}
                    <td className="pg-td pg-td--overflow">
                      <span className="pg-td__ellipsis" title={o.ownerAddress}>
                        {o.ownerAddress || '—'}
                      </span>
                    </td>

                    {/* Phone 1 */}
                    <td className="pg-td">
                      <span style={{ color: '#4a5568' }}>{o.phone1 || '—'}</span>
                    </td>

                    {/* Phone 2 */}
                    <td className="pg-td">
                      <span className="pg-td__muted">{o.phone2 || '—'}</span>
                    </td>

                    {/* City — separate column */}
                    <td className="pg-td">
                      <span style={{ color: '#4a5568' }}>{o.city || '—'}</span>
                    </td>

                    {/* District — separate column */}
                    <td className="pg-td">
                      <span style={{ color: '#4a5568' }}>{o.district || '—'}</span>
                    </td>

                    {/* State — always visible */}
                    <td className="pg-td">
                      <span style={{ color: '#4a5568' }}>{o.state || '—'}</span>
                    </td>

                    {/* Email — always visible */}
                    <td className="pg-td pg-td--overflow">
                      <span
                        className="pg-td__ellipsis"
                        title={o.emailAddress}
                        style={{ color: o.emailAddress ? '#4a5568' : '#c0c0d8' }}
                      >
                        {o.emailAddress || '—'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="pg-td">
                      <div className="pg-action-wrap">
                        <button className="pg-btn-view" onClick={() => handleEdit(o)} title="Edit">
                          <Edit2 size={13} />
                        </button>
                        {/* <button className="pg-btn-view" onClick={() => handleView(o)} title="View">
                          <Eye size={13} />
                        </button> */}
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="pg-mobile-cards">
            {paginated.length === 0 ? (
              <div className="pg-empty__inner" style={{ padding: '40px 20px' }}>
                <UserCircle size={36} color="#d0d0e8" />
                <span className="pg-empty__label">No owners found</span>
              </div>
            ) : paginated.map(o => (
              <OwnerCard key={o._id} o={o} onEdit={handleEdit} onView={handleView} />
            ))}
          </div>

          {/* Pagination */}
          <div className="pg-pagination">
            <div className="pg-pagination__left">
              <button className="pg-pg-btn" disabled={page === 1} onClick={() => setPage(1)}>
                <ChevronsLeft size={13} />
              </button>
              <button className="pg-pg-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft size={13} />
              </button>
              {pageNums.map((p, i) =>
                p === '…'
                  ? <span key={`e${i}`} className="pg-pg-ellipsis">…</span>
                  : <button
                    key={p}
                    className={`pg-pg-btn${page === p ? ' pg-pg-btn--active' : ''}`}
                    onClick={() => setPage(p)}
                  >{p}</button>
              )}
              <button className="pg-pg-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight size={13} />
              </button>
              <button className="pg-pg-btn" disabled={page === totalPages} onClick={() => setPage(totalPages)}>
                <ChevronsRight size={13} />
              </button>
            </div>
            <div className="pg-pagination__right">
              <select
                className="pg-pagesize-select"
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              >
                {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="pg-pagination__text">Items per page</span>
              <span className="pg-pagination__text">
                {page} of {totalPages} pages ({sorted.length} items)
              </span>
            </div>
          </div>

        </div>
      </div>

      {showModal && (
        <OwnerModal
          onClose={closeModal}
          onSaved={handleSaved}
          editData={editOwner}
        />
      )}
      {viewOwner && (
        <ViewModal owner={viewOwner} onClose={closeView} onEdit={handleEdit} />
      )}
    </>
  );
}