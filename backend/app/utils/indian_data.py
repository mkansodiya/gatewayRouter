import random
from typing import Dict, Any

FIRST_NAMES = [
    "Aarav", "Aanya", "Abhishek", "Aditi", "Aditya", "Akash", "Amit", "Ananya", "Anil", "Anjali",
    "Arjun", "Arvind", "Ayush", "Bhavna", "Chaitanya", "Deepak", "Dev", "Divya", "Ganesh", "Gaurav",
    "Geeta", "Hari", "Harish", "Ishaan", "Ishita", "Jaya", "Jyoti", "Kabir", "Karan", "Kavita",
    "Kiran", "Krishna", "Kunal", "Lata", "Madhav", "Manish", "Meera", "Manoj", "Nehal", "Neha",
    "Nikhil", "Nisha", "Pankaj", "Pooja", "Pranav", "Priya", "Rahul", "Rajesh", "Rohan", "Riya",
    "Sachin", "Sanjay", "Sanya", "Shikha", "Shreya", "Siddharth", "Sneha", "Sunita", "Tanvi", "Tarun",
    "Uday", "Varun", "Vihaan", "Vikram", "Vinay", "Vivek", "Yash", "Yuvraj"
]

LAST_NAMES = [
    "Acharya", "Agarwal", "Bose", "Bhatt", "Chakarborty", "Chawla", "Choudhury", "Das", "Deshmukh", "Dutta",
    "Gupta", "Iyer", "Jain", "Jha", "Joshi", "Kapoor", "Kulkarni", "Kumar", "Mehta", "Mishra",
    "Mukherjee", "Nair", "Patel", "Patil", "Pillai", "Prasad", "Rao", "Reddy", "Roy", "Saini",
    "Sen", "Shah", "Sharma", "Shukla", "Singh", "Sinha", "Trivedi", "Varma", "Verma", "Yadav"
]

# Real City, State, and corresponding realistic postal codes in India
CITIES_STATES_PINCODES = [
    ("Mumbai", "MH", "400001"),
    ("Mumbai", "MH", "400050"),
    ("Mumbai", "MH", "400092"),
    ("Pune", "MH", "411001"),
    ("Pune", "MH", "411038"),
    ("Thane", "MH", "400601"),
    ("Bengaluru", "KA", "560001"),
    ("Bengaluru", "KA", "560037"),
    ("Bengaluru", "KA", "560103"),
    ("Chennai", "TN", "600001"),
    ("Chennai", "TN", "600018"),
    ("Hyderabad", "TG", "500001"),
    ("Hyderabad", "TG", "500081"),
    ("New Delhi", "DL", "110001"),
    ("New Delhi", "DL", "110011"),
    ("Noida", "UP", "201301"),
    ("Gurugram", "HR", "122001"),
    ("Ahmedabad", "GJ", "380001"),
    ("Ahmedabad", "GJ", "380015"),
    ("Surat", "GJ", "395007"),
    ("Vadodara", "GJ", "390001"),
    ("Jaipur", "RJ", "302001"),
    ("Jaipur", "RJ", "302015"),
    ("Kolkata", "WB", "700001"),
    ("Kolkata", "WB", "700091"),
    ("Chandigarh", "CH", "160017"),
    ("Lucknow", "UP", "226001"),
    ("Indore", "MP", "452001"),
    ("Kochi", "KL", "682001"),
    ("Visakhapatnam", "AP", "530001")
]

STREET_PREFIXES = [
    "Flat No. {num}, {name} Apartments",
    "House No. {num}, {name} Villa",
    "Plot No. {num}, Sector {sec}",
    "Flat {num}, Block {block}, {name} Enclave",
    "Studio {num}, {name} Heights"
]

STREET_NAMES = [
    "Royal", "Green Glen", "Shanti", "Ganesh", "Sai Baba", "Krishna", "Orchid", "Gold Hill",
    "Sunshine", "Elite", "Maple", "Nirmal", "Venkateshwara", "Ganga", "Yamuna", "Godavari"
]

ROADS = [
    "MG Road", "Link Road", "Station Road", "Jubilee Hills", "Whitefield Main Road", "Bandra West",
    "Ring Road", "Salt Lake Sector V", "Satellite Road", "Kothrud Road", "T. Nagar", "G.T. Road"
]

def generate_indian_billing_details() -> Dict[str, Any]:
    """
    Generates a realistic dictionary representing billing_details for an Indian customer,
    matching Name, Email, and a structured Address (line1, city, state, postal_code, country='IN').
    """
    first = random.choice(FIRST_NAMES)
    last = random.choice(LAST_NAMES)
    name = f"{first} {last}"
    
    # Generate email
    domain = random.choice(["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"])
    email = f"{first.lower()}.{last.lower()}{random.randint(10, 99)}@{domain}"
    
    # Select city, state, postal code
    city, state, base_pincode = random.choice(CITIES_STATES_PINCODES)
    
    # Generate line1 with some randomness
    prefix_template = random.choice(STREET_PREFIXES)
    num = str(random.randint(1, 999))
    block = random.choice(["A", "B", "C", "D", "E"])
    sec = str(random.randint(1, 24))
    name_placeholder = random.choice(STREET_NAMES)
    
    line1 = prefix_template.format(num=num, block=block, sec=sec, name=name_placeholder)
    line2 = random.choice(ROADS)
    full_line1 = f"{line1}, {line2}"
    
    return {
        "name": name,
        "email": email,
        "address": {
            "line1": full_line1,
            "city": city,
            "state": state,
            "postal_code": base_pincode,
            "country": "IN"
        }
    }
