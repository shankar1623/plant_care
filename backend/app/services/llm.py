import os
import json
import logging
from pathlib import Path
from app.config import settings

logger = logging.getLogger("plantcare.llm")

# Load medicines table for grounding
MEDICINES_FILE = Path(__file__).resolve().parent.parent / "data" / "medicines.json"
MEDICINES_DATA = {}
if MEDICINES_FILE.exists():
    with open(MEDICINES_FILE, "r", encoding="utf-8") as f:
        MEDICINES_DATA = json.load(f)

# Language name mapping
LANG_NAMES = {
    "en": "English",
    "hi": "Hindi (हिंदी)",
    "ta": "Tamil (தமிழ்)",
    "te": "Telugu (తెలుగు)",
    "kn": "Kannada (ಕನ್ನಡ)",
    "ml": "Malayalam (മലയാളം)",
    "mr": "Marathi (मराठी)",
    "bn": "Bengali (বাংলা)"
}

def find_medicine_entry(plant_name: str | None, disease_name: str | None) -> dict | None:
    """
    Look up medicine entry by matching BOTH plant and disease exactly (case-insensitive).
    Returns None if either parameter is None/empty or no exact match is found.
    """
    if not plant_name or not disease_name:
        return None
    p_norm = plant_name.strip().lower()
    d_norm = disease_name.strip().lower()
    for k, item in MEDICINES_DATA.items():
        item_plant = (item.get("plant") or "").strip().lower()
        if item_plant != p_norm:
            continue

        item_disease = (item.get("disease") or "").strip().lower()
        base_disease = item_disease.split("(")[0].strip()
        key_disease = k.split("___")[1].replace("_", " ").strip().lower() if "___" in k else ""

        if d_norm == item_disease or d_norm == base_disease or d_norm == key_disease:
            return item
    return None

def is_initial_overview_prompt(message: str, history: list | None) -> bool:
    """
    Checks if this request is the automated initial explanation prompt when entering chat,
    or an explicit request for the 4-part medicine dosage summary.
    """
    if history and len(history) > 0:
        return False
    msg = (message or "").strip()
    low = msg.lower()

    if "explain the prescribed medicine" in low:
        return True
    if "give practical general crop care" in low:
        return True
    if any(k in msg for k in [
        "निर्धारित दवा", "सामान्य देखभाल के उपयोगी सुझाव",
        "மருந்தின் பெயர்", "பொதுவான பராமரிப்பு",
        "మందు పేరు", "సాధారణ సంరక్షణ",
        "ಔಷಧಿಯ ಹೆಸರು", "ಸಾಮಾನ್ಯ ರಕ್ಷಣೆ",
        "മരുന്നിന്റെ പേര്", "പൊതുവായ വിള",
        "औषधाचे नाव", "सर्वसाधारण काळजीचे",
        "ওষুধের নাম", "সাধারণ যত্নের"
    ]):
        return True
    return False

async def generate_agricultural_chat_response(
    user_message: str,
    plant_name: str | None = None,
    disease_name: str | None = None,
    current_medicine: str | None = None,
    language: str = "en",
    history: list = None
) -> str:
    """
    Generates a conversational explanation grounded in the medicine table
    using Groq LLM (settings.GROQ_MODEL with fallbacks).
    For initial opening, provides the 4-section medicine card.
    For user input questions, gives a direct, conversational, human answer to the specific question.
    """
    lang_name = LANG_NAMES.get(language, "English")
    has_scan_context = bool(plant_name and disease_name and current_medicine)
    is_overview = is_initial_overview_prompt(user_message, history)

    relevant_med = find_medicine_entry(plant_name, disease_name) if has_scan_context else None
    primary = relevant_med.get("primary_medicine", {}) if relevant_med else {}

    dosage = primary.get("dosage", "2 to 2.5 g per liter of water") if primary else "2 to 2.5 g per liter of water"
    interval = primary.get("spray_interval", "every 7 to 10 days") if primary else "every 7 to 10 days"
    spray_time = primary.get("spray_time", "early morning or late afternoon") if primary else "early morning or late afternoon"
    precautions = primary.get("precautions", "Wear protective mask and gloves. Wash hands with soap after spraying.") if primary else "Wear protective mask and gloves. Wash hands with soap after spraying."

    context_str = f"Plant: {plant_name}\nDisease: {disease_name}\nPrescribed Medicine: {current_medicine}\n"
    if primary:
        context_str += (
            f"Official Dosage: {dosage}\n"
            f"Spray Interval: {interval}\n"
            f"Best Spray Time: {spray_time}\n"
            f"Safety Precautions: {precautions}\n"
        )

    # Build prompt depending on whether it's the initial overview card or a specific user question
    if has_scan_context:
        if is_overview:
            system_prompt = f"""You are PlantCare AI Doctor, a practical agricultural expert guiding farmers.
Respond directly in {lang_name}.

The farmer has {plant_name} diagnosed with {disease_name}, prescribed {current_medicine}.
Ground all instructions in this verified data:
{context_str}

STRICT CONTENT & FORMATTING RULES:
1. ABSOLUTELY NO ASTERISKS (*) OR MARKDOWN STARS (**) IN YOUR RESPONSE.
2. Do not invent or guess dosage; rely strictly on verified data.
3. Use simple, everyday, easy-to-understand language. NO long academic definitions.
4. PRESENT THESE 4 SIMPLE AND DIRECT SECTIONS:
   1. Medicine Name: {current_medicine}
   2. How to Use & Dosage: Exact grams or ml per 1 liter of clean water.
   3. Spray Timing & Schedule: How many days interval, and spray in calm early morning or evening.
   4. Safety Precautions: Wear mask and gloves, wash hands with soap, keep away from kids and animals.
"""
        else:
            system_prompt = f"""You are PlantCare AI Doctor, an experienced, friendly agricultural doctor and crop expert helping a farmer.
Respond directly in {lang_name}.

The farmer's crop context:
- Plant: {plant_name}
- Disease: {disease_name}
- Prescribed Medicine: {current_medicine}
- Official Dosage: {dosage}
- Spray Interval: {interval}
- Best Spray Time: {spray_time}
- Safety Precautions: {precautions}

STRICT RULES:
1. Directly and conversationally answer the farmer's specific question or concern.
2. DO NOT repeat the 4-part prescription summary (Medicine Name, How to Use, Spray Timing, Safety Precautions) unless the farmer specifically asked for the full guide again.
3. ABSOLUTELY NO ASTERISKS (*) OR MARKDOWN STARS (**) IN YOUR RESPONSE.
4. Keep the answer practical, warm, concise, and easy to understand for any farmer.
5. If the farmer asks whether something is safe (like spraying during rain, mixing with fertilizers, harvesting immediately), give a clear direct answer (e.g. No / Yes) followed by the explanation and safe practical guidance.
"""
    else:
        if is_overview:
            system_prompt = f"""You are PlantCare AI Doctor, a practical agricultural expert guiding farmers.
Respond directly in {lang_name}.

No scan is selected. Give only general crop-care advice. Do not state any medicine name, dose or spray interval; ask the farmer to scan a leaf first.

STRICT CONTENT & FORMATTING RULES:
1. ABSOLUTELY NO ASTERISKS (*) OR MARKDOWN STARS (**) IN YOUR RESPONSE.
2. Do not invent dosage or state any medicine name; ask the farmer to scan a leaf first.
3. Use simple, everyday, easy-to-understand language.
"""
        else:
            system_prompt = f"""You are PlantCare AI Doctor, a practical agricultural expert guiding farmers.
Respond directly in {lang_name}.

STRICT CONTENT & FORMATTING RULES:
1. Answer the farmer's question directly, clearly, and helpfully in simple everyday language.
2. ABSOLUTELY NO ASTERISKS (*) OR MARKDOWN STARS (**) IN YOUR RESPONSE.
3. If they ask about specific chemicals or dosages for an unknown disease, politely remind them to take a photo and scan the plant leaf first in the app.
"""

    # Query Groq with models supported on this account
    if settings.GROQ_API_KEY and settings.GROQ_API_KEY.strip():
        models_to_try = [settings.GROQ_MODEL, "allam-2-7b", "openai/gpt-oss-120b"]
        for model_name in models_to_try:
            try:
                from groq import AsyncGroq
                client = AsyncGroq(api_key=settings.GROQ_API_KEY.strip())
                messages = [{"role": "system", "content": system_prompt}]
                
                if history:
                    for h in history[-6:]: # Include last 3 exchanges
                        role = h.get("role", "user")
                        content = h.get("content", "")
                        if role in ("user", "assistant") and content:
                            messages.append({"role": role, "content": content})
                
                messages.append({"role": "user", "content": user_message})

                completion = await client.chat.completions.create(
                    model=model_name,
                    messages=messages,
                    temperature=0.3,
                    max_tokens=650
                )
                if completion.choices and completion.choices[0].message.content:
                    raw_text = completion.choices[0].message.content.strip()
                    if raw_text:
                        logger.info(f"Answered chat request using model {model_name}")
                        clean_text = raw_text.replace('**', '').replace('*', '').strip()
                        return clean_text
            except Exception as e:
                logger.warning(f"Groq API model {model_name} error: {e}. Trying next...")

    # Fallback replies when LLM is unavailable
    if not has_scan_context:
        general_fallbacks = {
            "hi": "कोई स्कैन चयनित नहीं है। कृपया दवा और सही मात्रा जानने के लिए पहले पौधे की पत्ती को स्कैन करें। सामान्य देखभाल के लिए पर्याप्त धूप दें और जलभराव से बचें।",
            "ta": "எந்த ஸ்கேனும் தேர்ந்தெடுக்கப்படவில்லை. மருந்து மற்றும் மருந்தளவு பரிந்துரைகளைப் பெற முதலில் பயிர் இலையை ஸ்கேன் செய்யவும்.",
            "te": "ఏ స్కాన్ ఎంపిక చేయబడలేదు. మందు మరియు మోతాదు వివరాల కోసం దయచేసి ముందుగా ఆకును స్కాన్ చేయండి.",
            "kn": "ಯಾವುದೇ ಸ್ಕ್ಯಾನ್ ಆಯ್ಕೆಯಾಗಿಲ್ಲ. ಔಷಧ ಮತ್ತು ಪ್ರಮಾಣದ ವಿವರಗಳನ್ನು ಪಡೆಯಲು ದಯವಿಟ್ಟು ಮೊದಲು ಎಲೆಯನ್ನು ಸ್ಕ್ಯಾನ್ ಮಾಡಿ.",
            "ml": "സ്കാൻ ഒന്നും തിരഞ്ഞെടുത്തിട്ടില്ല. രോഗനിർണയത്തിനും മരുന്ന് വിവരങ്ങൾക്കുമായി ദയവായി ആദ്യം ഒരു ഇല സ്കാൻ ചെയ്യുക.",
            "mr": "कोणतेही स्कॅन निवडलेले नाही. योग्य औषध आणि मात्रा जाणून घेण्यासाठी कृपया आधी एका पानाचे स्कॅन करा.",
            "bn": "কোনো স্ক্যান নির্বাচন করা হয়নি। সঠিক ওষুধ ও মাত্রার পরামর্শ পেতে অনুগ্রহ করে প্রথমে একটি পাতা স্ক্যান করুন।",
            "en": "No scan is selected. Please scan a plant leaf first with the camera to receive accurate disease diagnosis and verified medicine recommendations."
        }
        return general_fallbacks.get(language, general_fallbacks["en"])

    # Fallback when scan context exists:
    # If it is NOT the overview (the farmer asked a specific question in the input), give a direct answer
    if not is_overview:
        low_q = (user_message or "").lower()
        if any(w in low_q for w in ["rain", "cloudy", "बारिश", "மழை", "వర్షం", "ಮಳೆ", "മഴ", "पाऊस", "বৃষ্টি"]):
            rain_replies = {
                "hi": "बारिश के दौरान या बारिश की संभावना होने पर छिड़काव न करें। बारिश से दवा पत्तों से बह जाएगी और असर खत्म हो जाएगा। मौसम साफ और शांत होने पर ही छिड़काव करें।",
                "ta": "மழை பெய்யும் போதோ அல்லது மழை வரும் வாய்ப்பு இருக்கும் போதோ தெளிக்க வேண்டாம். தெளித்தால் மருந்து நீரில் அடித்து செல்லப்பட்டு பலன் தராது. வெயில் அல்லது தெளிவான வானிலை உள்ள போது தெளிக்கவும்.",
                "te": "వర్షం పడే సమయంలో లేదా వర్ష సూచన ఉన్నప్పుడు మందు పిచికారీ చేయవద్దు. వర్షానికి మందు కరిగిపోయి ఎలాంటి ఫలితం ఉండదు. వాతావరణం పొడిగా ఉన్నప్పుడు మాత్రమే పిచికారీ చేయండి.",
                "en": "Do not spray while it is raining or if rain is expected within the next 4 to 6 hours. Rain will wash the medicine off the leaves before it can be absorbed. Wait for calm, dry weather."
            }
            return rain_replies.get(language, rain_replies["en"])

        if any(w in low_q for w in ["mix", "fertilizer", "खाद", "உரம்", "ఎరువు", "ಗೊಬ್ಬರ", "വളം", "खत", "সার"]):
            mix_replies = {
                "hi": f"फफूंदनाशक ({current_medicine}) को यूरिया या अन्य रासायनिक खादों के साथ एक साथ मिलाकर न छिड़कें। दोनों को अलग-अलग समय पर इस्तेमाल करना ही सुरक्षित और असरदार होता है।",
                "ta": f"{current_medicine} மருந்தை உரங்களுடன் சேர்த்து கலக்காமல் தனியாக தெளிப்பதே சிறந்தது மற்றும் பாதுகாப்பானது.",
                "te": f"{current_medicine} మందును ఎరువులతో కలిపి కాకుండా విడిగా పిచికారీ చేయడమే పంటకు సురక్షితం.",
                "en": f"It is safest to apply {current_medicine} separately and avoid mixing it with fertilizers or other chemical products, as reactions can reduce effectiveness and harm crop leaves."
            }
            return mix_replies.get(language, mix_replies["en"])

        generic_q_replies = {
            "hi": f"{plant_name} के {disease_name} रोग के लिए {current_medicine} का उपयोग निर्धारित मात्रा ({dosage}) और {interval} के अनुसार करें। शांत सुबह या शाम को छिड़कें।",
            "ta": f"{plant_name} பயிரில் {disease_name} நோய்க்கு {current_medicine} மருந்தை {dosage} அளவில் {interval} இடைவெளியில் பயன்படுத்தவும்.",
            "te": f"{plant_name} లో {disease_name} నివారణకు {current_medicine} ను {dosage} మోతాదులో {interval} ప్రకారం వాడండి.",
            "en": f"For {plant_name} affected by {disease_name}, follow the prescribed {current_medicine} application at {dosage}, sprayed {interval} during calm morning or late afternoon."
        }
        return generic_q_replies.get(language, generic_q_replies["en"])

    # Fallback for initial overview card
    if language == "hi":
        return (
            f"1. दवा का नाम: {current_medicine}\n\n"
            f"2. उपयोग करने की विधि (मात्रा):\n"
            f"• प्रति 1 लीटर पानी में {dosage} अच्छी तरह मिलाएं।\n"
            f"• पौधे की पत्तियों पर समान रूप से छिड़काव करें।\n\n"
            f"3. छिड़काव का समय और अंतराल:\n"
            f"• {interval} पर छिड़काव करें।\n"
            f"• सुबह की शांत धूप में या शाम को छिड़कें। बारिश में न छिड़कें।\n\n"
            f"4. जरूरी सावधानियां:\n"
            f"• {precautions}\n"
            f"• छिड़काव के समय मास्क और दस्ताने जरूर पहनें।\n"
            f"• बाद में हाथ-मुंह साबुन से धोएं और दवा को बच्चों से दूर रखें।"
        )
    elif language == "ta":
        return (
            f"1. மருந்தின் பெயர்: {current_medicine}\n\n"
            f"2. பயன்படுத்தும் முறை (மருந்தளவு):\n"
            f"• 1 லிட்டர் தண்ணீருக்கு {dosage} கலந்து தெளிக்கவும்.\n\n"
            f"3. தெளிக்கும் நேரம் மற்றும் இடைவெளி:\n"
            f"• {interval}. அதிகாலை அல்லது மாலை வேளையில் தெளிக்கவும்.\n\n"
            f"4. முன்னெச்சரிக்கை நடவடிக்கைகள்:\n"
            f"• {precautions}\n"
            f"• முகக்கவசம், கையுறை அணியவும். தெளித்த பின் கைகளை சோப்பால் கழுவவும்."
        )
    elif language == "te":
        return (
            f"1. మందు పేరు: {current_medicine}\n\n"
            f"2. వాడే విధానం (మోతాదు):\n"
            f"• 1 లీటరు నీటికి {dosage} కలిపి పిచికారీ చేయండి.\n\n"
            f"3. సమయం & విరామం:\n"
            f"• {interval}. ఉదయం లేదా సాయంత్రం వేళల్లో పిచికారీ చేయండి.\n\n"
            f"4. జాగ్రత్తలు:\n"
            f"• {precautions}\n"
            f"• మాస్క్ మరియు గ్లౌజులు ధరించండి. పిల్లలకు దూరంగా ఉంచండి."
        )
    elif language == "kn":
        return (
            f"1. ಔಷಧಿಯ ಹೆಸರು: {current_medicine}\n\n"
            f"2. ಬಳಸುವ ವಿಧಾನ (ಪ್ರಮಾಣ):\n"
            f"• 1 ಲೀಟರ್ ನೀರಿಗೆ {dosage} ಬೆರೆಸಿ ಸಿಂಪಡಿಸಿ.\n\n"
            f"3. ಸಿಂಪಡಿಸುವ ಸಮಯ:\n"
            f"• {interval}. ಬೆಳಿಗ್ಗೆ ಅಥವಾ ಸಂಜೆ ಸಿಂಪಡಿಸಿ.\n\n"
            f"4. ಮುನ್ನೆಚ್ಚರಿಕೆಗಳು:\n"
            f"• {precautions}\n"
            f"• ಮಾಸ್ಕ್ ಮತ್ತು ಕೈಗವಸು ಧರಿಸಿ."
        )
    elif language == "ml":
        return (
            f"1. മരുന്നിന്റെ പേര്: {current_medicine}\n\n"
            f"2. ഉപയോഗിക്കുന്ന വിധം (അളവ്):\n"
            f"• 1 ലിറ്റർ വെള്ളത്തിൽ {dosage} നന്നായി കലക്കുക.\n"
            f"• ഇലകളിൽ തുല്യമായി തളിക്കുക.\n\n"
            f"3. തളിക്കേണ്ട സമയവും ഇടവേളയും:\n"
            f"• {interval}.\n"
            f"• അതിരാവിലെയോ വൈകുന്നേരമോ തളിക്കുക. മഴയുള്ളപ്പോൾ തളിക്കരുത്.\n\n"
            f"4. മുൻകരുതലുകൾ:\n"
            f"• {precautions}\n"
            f"• മാസ്കും കയ്യുറകളും ധരിക്കുക. കുട്ടികളിൽ നിന്ന് അകറ്റി സൂക്ഷിക്കുക."
        )
    elif language == "mr":
        return (
            f"1. औषधाचे नाव: {current_medicine}\n\n"
            f"2. वापरण्याची पद्धत (प्रमाण):\n"
            f"• प्रति १ लिटर पाण्यात {dosage} व्यवस्थित मिसळा.\n"
            f"• पानांवर एकसारखी फवारणी करा.\n\n"
            f"3. फवारणीची वेळ आणि अंतर:\n"
            f"• {interval}.\n"
            f"• सकाळी किंवा संध्याकाळी फवारणी करा. पावसात फवारणी करू नका.\n\n"
            f"4. महत्त्वाची काळजी:\n"
            f"• {precautions}\n"
            f"• मास्क आणि हातमोजे वापरा. मुलांपासून औषध दूर ठेवा."
        )
    elif language == "bn":
        return (
            f"1. ওষুধের নাম: {current_medicine}\n\n"
            f"2. ব্যবহারের নিয়ম (মাত্রা):\n"
            f"• প্রতি ১ লিটার জলে {dosage} ভালোভাবে মেশান।\n"
            f"• পাতার উপর সমানভাবে স্প্রে করুন।\n\n"
            f"3. স্প্রে করার সময় ও ব্যবধান:\n"
            f"• {interval} অন্তর স্প্রে করুন।\n"
            f"• সকালে অথবা বিকেলে স্প্রে করুন। বৃষ্টির সময় স্প্রে করবেন না।\n\n"
            f"4. প্রয়োজনীয় সতর্কতা:\n"
            f"• {precautions}\n"
            f"• স্প্রে করার সময় মাস্ক এবং গ্লাভস পরুন। বাচ্চাদের থেকে দূরে রাখুন।"
        )
    else:
        return (
            f"1. Medicine Name: {current_medicine}\n\n"
            f"2. How to Use & Dosage:\n"
            f"• Mix {dosage} in 1 liter of clean water.\n"
            f"• Spray evenly covering all affected leaves.\n\n"
            f"3. Spray Timing & Schedule:\n"
            f"• Spray {interval}.\n"
            f"• Apply during calm early mornings or late afternoons. Do not spray during rain or strong wind.\n\n"
            f"4. Safety Precautions:\n"
            f"• {precautions}\n"
            f"• Wear a face mask and protective gloves while spraying.\n"
            f"• Wash hands and face thoroughly with soap after spraying.\n"
            f"• Keep medicines securely away from children and farm animals."
        )
