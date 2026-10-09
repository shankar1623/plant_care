import React, { useState, useRef, useEffect } from 'react';
import { Send, ArrowLeft, Bot, User, Globe, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import { sendChatMessage } from '../api/client';

export default function Chat({ onNavigate, t, chatContext, currentLang }) {
  // Scoped strictly to Chatbot - does NOT alter global application language
  const [chatLang, setChatLang] = useState(currentLang || 'en');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [speakingId, setSpeakingId] = useState(null);
  const messagesEndRef = useRef(null);

  // Read context from props or fallback to localStorage
  const effectiveContext = (() => {
    if (chatContext?.plant && chatContext?.disease) {
      return chatContext;
    }
    try {
      const stored = localStorage.getItem('plantcare_chat_context');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.plant && parsed?.disease) {
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  })();

  const hasContext = Boolean(effectiveContext);
  const plantName = hasContext ? effectiveContext.plant : null;
  const diseaseName = hasContext ? effectiveContext.disease : null;
  const medicineName = hasContext ? (effectiveContext.medicine || null) : null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  // Clean up speech when navigating away
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const quickQuestions = {
    en: [
      "How much to mix per liter of water?",
      "How many times to spray and intervals?",
      "What precautions should I take while spraying?"
    ],
    hi: [
      "प्रति लीटर पानी में कितनी दवा मिलानी चाहिए?",
      "कितने दिनों के अंतराल पर छिड़काव करें?",
      "छिड़काव करते समय क्या सावधानियां बरतें?"
    ],
    ta: [
      "1 லிட்டர் தண்ணீருக்கு எவ்வளவு மருந்து கலக்க வேண்டும்?",
      "எத்தனை நாட்களுக்கு ஒருமுறை மருந்து தெளிக்க வேண்டும்?",
      "மருந்து தெளிக்கும் போது என்ன முன்னெச்சரிக்கை எடுக்க வேண்டும்?"
    ],
    te: [
      "లీటరు నీటికి ఎంత మందు కలపాలి?",
      "ఎన్ని రోజులకు ఒకసారి పిచికారీ చేయాలి?",
      "పిచికారీ చేసేటప్పుడు తీసుకోవాల్సిన జాగ్రత్తలు ఏమిటి?"
    ],
    kn: [
      "ಪ್ರತಿ ಲೀಟರ್ ನೀರಿಗೆ ಎಷ್ಟು ಔಷಧಿ ಬೆರೆಸಬೇಕು?",
      "ಎಷ್ಟು ದಿನಗಳಿಗೊಮ್ಮೆ ಸಿಂಪಡಿಸಬೇಕು?",
      "ಸಿಂಪಡಿಸುವಾಗ ಯಾವ ಮುನ್ನೆಚ್ಚರಿಕೆಗಳನ್ನು ವಹಿಸಬೇಕು?"
    ],
    ml: [
      "1 ലിറ്റർ വെള്ളത്തിൽ എത്ര മരുന്ന് ചേർക്കണം?",
      "എത്ര ദിവസത്തിലൊരിക്കൽ തളിക്കണം?",
      "മരുന്ന് തളിക്കുമ്പോൾ എന്തൊക്കെ മുൻകരുതലുകൾ എടുക്കണം?"
    ],
    mr: [
      "प्रति लिटर पाण्यात किती औषध मिसळावे?",
      "फवारणी किती दिवसांच्या अंतराने करावी?",
      "फवारणी करताना कोणती काळजी घ्यावी?"
    ],
    bn: [
      "প্রতি লিটার জলে কতটা ওষুধ মেশাতে হবে?",
      "কত দিন অন্তর স্প্রে করতে হবে?",
      "ওষুধ স্প্রে করার সময় কী কী সতর্কতা নেওয়া উচিত?"
    ]
  };

  // Female Voice Text-to-Speech
  const cleanTextForSpeech = (text) => {
    return (text || '')
      .replace(/[*#_~`]/g, '')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/•/g, ', ')
      .trim();
  };

  const handleSpeak = (msgId, text) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert("Text-to-speech is not supported on this browser.");
      return;
    }

    if (speakingId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = cleanTextForSpeech(text);
    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Language code map with all 8 supported languages
    const langCodes = {
      en: 'en-IN',
      hi: 'hi-IN',
      ta: 'ta-IN',
      te: 'te-IN',
      kn: 'kn-IN',
      ml: 'ml-IN',
      mr: 'mr-IN',
      bn: 'bn-IN'
    };
    utterance.lang = langCodes[chatLang] || 'en-US';

    // Prioritize female voice selection
    const voices = window.speechSynthesis.getVoices();
    const targetLangPrefix = utterance.lang.split('-')[0];
    
    const femaleKeywords = [
      'female', 'zira', 'samantha', 'swara', 'neerja', 'kalpana', 
      'priya', 'kavya', 'geeta', 'victoria', 'heera', 'susan', 'jenny', 'natasha'
    ];

    let selectedVoice = voices.find(v => 
      v.lang.toLowerCase().startsWith(targetLangPrefix) && 
      femaleKeywords.some(kw => v.name.toLowerCase().includes(kw))
    );

    if (!selectedVoice) {
      selectedVoice = voices.find(v => v.lang.toLowerCase().startsWith(targetLangPrefix));
    }
    if (!selectedVoice) {
      selectedVoice = voices.find(v => femaleKeywords.some(kw => v.name.toLowerCase().includes(kw)));
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.pitch = 1.15;
    utterance.rate = 0.94;

    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    setSpeakingId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Automatically fetch complete structured explanation when entering or changing language
  const loadAutoExplanation = async (lang) => {
    setIsSending(true);
    let promptText = '';

    if (hasContext) {
      promptText = `Explain the prescribed medicine (${medicineName || 'Recommended medicine'}), exact dosage per liter of water, spray timing, and all safety precautions for ${plantName} (${diseaseName}) in simple, normal, plain English. Do not use asterisks or textbook filler.`;
      
      if (lang === 'hi') {
        promptText = `${plantName} में ${diseaseName} के लिए निर्धारित दवा (${medicineName || 'दवा'}) का नाम, इसका सही उपयोग (मात्रा), छिड़काव का समय और सावधानियां सरल हिंदी में बताएं। कोई स्टार चिह्न न लगाएं।`;
      } else if (lang === 'ta') {
        promptText = `${plantName} பயிரில் ${diseaseName} நோய்க்கான ${medicineName || 'மருந்து'} மருந்தின் பெயர், பயன்படுத்தும் முறை (மருந்தளவு), தெளிக்கும் நேரம் மற்றும் முன்னெச்சரிக்கை விவரங்களை எளிய தமிழில் கூறவும்.`;
      } else if (lang === 'te') {
        promptText = `${plantName} లో ${diseaseName} నివారణకు ${medicineName || 'మందు'} మందు పేరు, మోతాదు, పిచికారీ సమయం మరియు జాగ్రత్తలను సరళమైన తెలుగులో వివరించండి.`;
      } else if (lang === 'kn') {
        promptText = `${plantName} ಬೆಳೆಯಲ್ಲಿ ${diseaseName} ರೋಗಕ್ಕೆ ${medicineName || 'ಔಷಧಿ'} ಔಷಧಿಯ ಹೆಸರು, ಬಳಸುವ ಪ್ರಮಾಣ, ಸಮಯ ಮತ್ತು ಮುನ್ನೆಚ್ಚರಿಕೆಗಳನ್ನು ಕನ್ನಡದಲ್ಲಿ ತಿಳಿಸಿ.`;
      } else if (lang === 'ml') {
        promptText = `${plantName} വിളയിലെ ${diseaseName} രോഗത്തിനായുള്ള ${medicineName || 'മരുന്ന്'} മരുന്നിന്റെ പേര്, ഉപയോഗിക്കേണ്ട അളവ്, തളിക്കേണ്ട സമയം, മുൻകരുതലുകൾ എന്നിവ ലളിതമായ മലയാളത്തിൽ വിവരിക്കുക.`;
      } else if (lang === 'mr') {
        promptText = `${plantName} पिकावरील ${diseaseName} रोगासाठी दिलेल्या ${medicineName || 'औषध'} औषधाचे नाव, वापरण्याची पद्धत (मात्रा), फवारणीची वेळ आणि काळजी सोप्या मराठीत सांगा.`;
      } else if (lang === 'bn') {
        promptText = `${plantName} ফসলের ${diseaseName} রোগের জন্য নির্ধারিত ${medicineName || 'ওষুধ'} ওষুধের নাম, সঠিক মাত্রা, স্প্রে করার সময় এবং সতর্কতা সহজ বাংলায় ব্যাখ্যা করুন।`;
      }
    } else {
      promptText = `Give practical general crop care and disease prevention tips for farmers in simple English. Remind the farmer to scan a leaf first for specific disease diagnosis and medicine advice.`;

      if (lang === 'hi') {
        promptText = `फसलों की सामान्य देखभाल के उपयोगी सुझाव दें और किसान को बताएं कि सटीक दवा और मात्रा के लिए पहले पत्ती को स्कैन करें।`;
      } else if (lang === 'ta') {
        promptText = `பயிர்களின் பொதுவான பராமரிப்பு ஆலோசனைகளை வழங்கவும், துல்லியமான மருந்தளவு பெற முதலில் இலையை ஸ்கேன் செய்யுமாறு கூறவும்.`;
      } else if (lang === 'te') {
        promptText = `పంటల సాధారణ సంరక్షణ వివరాలు తెలియజేయండి మరియు నిర్దిష్ట మందు కోసం ముందుగా ఆకును స్కాన్ చేయమని సూచించండి.`;
      } else if (lang === 'kn') {
        promptText = `ಬೆಳೆಗಳ ಸಾಮಾನ್ಯ ರಕ್ಷಣೆ ಮತ್ತು ಆರೈಕೆಯ ಸಲಹೆಗಳನ್ನು ನೀಡಿ ಮತ್ತು ನಿಖರ ಔಷಧಿಗಾಗಿ ಮೊದಲು ಎಲೆಯನ್ನು ಸ್ಕ್ಯಾನ್ ಮಾಡಲು ತಿಳಿಸಿ.`;
      } else if (lang === 'ml') {
        promptText = `പൊതുവായ വിള പരിപാലന നിർദ്ദേശങ്ങൾ നൽകുക. കൃത്യമായ മരുന്ന് ലഭിക്കുന്നതിന് ആദ്യം ഒരു ഇല സ്കാൻ ചെയ്യാൻ ഓർമ്മിപ്പിക്കുക.`;
      } else if (lang === 'mr') {
        promptText = `पिकांच्या सर्वसाधारण काळजीचे मार्गदर्शन करा आणि योग्य औषध सल्ल्यासाठी आधी पानाचे स्कॅन करा असे सुचवा.`;
      } else if (lang === 'bn') {
        promptText = `ফসলের সাধারণ যত্নের পরামর্শ দিন এবং সঠিক ওষুধ ও মাত্রার জন্য প্রথমে একটি পাতা স্ক্যান করতে বলুন।`;
      }
    }

    try {
      const res = await sendChatMessage({
        message: promptText,
        plant_name: plantName,
        disease_name: diseaseName,
        current_medicine: medicineName,
        language: lang,
        history: []
      });

      if (res?.reply) {
        const cleanReply = res.reply.replace(/\*\*/g, '').replace(/\*/g, '');
        setMessages([
          {
            id: Date.now(),
            role: 'assistant',
            content: cleanReply
          }
        ]);
      }
    } catch (err) {
      console.warn("Chat API error:", err);
      setMessages([
        {
          id: Date.now(),
          role: 'assistant',
          content: "The AI doctor is not reachable right now. Please try again, or ask your local agricultural officer."
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  // Run automatically when Chat opens
  useEffect(() => {
    loadAutoExplanation(chatLang);
  }, []);

  const handleLanguageChange = (newLang) => {
    setChatLang(newLang);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
    }
    loadAutoExplanation(newLang);
  };

  const handleSend = async (textToSend) => {
    const query = textToSend || input;
    if (!query.trim() || isSending) return;

    const userMsg = { id: Date.now(), role: 'user', content: query };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsSending(true);

    try {
      const res = await sendChatMessage({
        message: query,
        plant_name: plantName,
        disease_name: diseaseName,
        current_medicine: medicineName,
        language: chatLang,
        history: messages
      });

      if (res?.reply) {
        const cleanReply = res.reply.replace(/\*\*/g, '').replace(/\*/g, '');
        setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: cleanReply }]);
      }
    } catch (err) {
      console.warn("Chat API send error:", err);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: "The AI doctor is not reachable right now. Please try again, or ask your local agricultural officer."
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-2.5 sm:px-6 py-2 sm:py-4 md:py-6 flex flex-col h-[calc(100dvh-4rem-3.75rem)] md:h-[calc(100dvh-4.25rem)]">
      {/* Top Header & Scoped Chat Language Selector */}
      <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
        <button 
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-1.5 text-xs text-surface-muted hover:text-white transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" /> {t.dashboard}
        </button>

        {/* Scoped Chat Language Selector (8 Languages) */}
        <div className="flex items-center gap-1.5 sm:gap-2 bg-surface-card px-2.5 sm:px-3 py-1.5 rounded-xl border border-surface-border shadow-sm">
          <Globe className="w-3.5 h-3.5 text-forest-300 shrink-0" />
          <span className="text-[10px] sm:text-[11px] text-surface-muted font-medium hidden xs:inline">Language:</span>
          <select
            value={chatLang}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="bg-transparent text-xs font-bold text-forest-300 outline-none cursor-pointer"
          >
            <option value="en" className="bg-[#141f17] text-white">English (Default)</option>
            <option value="hi" className="bg-[#141f17] text-white">हिन्दी (Hindi)</option>
            <option value="ta" className="bg-[#141f17] text-white">தமிழ் (Tamil)</option>
            <option value="te" className="bg-[#141f17] text-white">తెలుగు (Telugu)</option>
            <option value="kn" className="bg-[#141f17] text-white">ಕನ್ನಡ (Kannada)</option>
            <option value="ml" className="bg-[#141f17] text-white">മലയാളം (Malayalam)</option>
            <option value="mr" className="bg-[#141f17] text-white">मराठी (Marathi)</option>
            <option value="bn" className="bg-[#141f17] text-white">বাংলা (Bengali)</option>
          </select>
        </div>
      </div>

      {/* Chat Messages Feed */}
      <div className="flex-1 overflow-y-auto space-y-3.5 p-4 rounded-2xl bg-surface-dark border border-surface-border mb-3 shadow-inner">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          const isSpeakingThis = speakingId === m.id;
          const cleanDisplayContent = (m.content || '').replace(/\*\*/g, '').replace(/\*/g, '');

          return (
            <div
              key={m.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs shadow-sm ${
                isUser ? 'bg-forest text-white' : 'bg-forest-900/80 border border-forest-500/40 text-forest-300'
              }`}>
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div className={`max-w-[88%] sm:max-w-[82%] p-4 rounded-2xl text-xs leading-relaxed shadow-sm ${
                isUser 
                  ? 'bg-forest text-white rounded-tr-none font-medium' 
                  : 'bg-surface-card border border-surface-border text-cream-100 rounded-tl-none whitespace-pre-line'
              }`}>
                {cleanDisplayContent}

                {/* Female Voice Speaker Button */}
                {!isUser && (
                  <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
                    <button
                      onClick={() => handleSpeak(m.id, cleanDisplayContent)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                        isSpeakingThis 
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                          : 'bg-surface-dark/90 hover:bg-forest-900/60 text-forest-300 border border-surface-border hover:border-forest-500/40'
                      }`}
                      title="Listen with natural Female Voice"
                    >
                      {isSpeakingThis ? (
                        <>
                          <VolumeX className="w-3.5 h-3.5 text-amber-400" />
                          <span>Stop Listening</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{chatLang === 'hi' ? 'महिला आवाज में सुनें' : 'Listen (Female Voice)'}</span>
                        </>
                      )}
                    </button>
                    <span className="text-[10px] text-surface-muted">
                      {chatLang === 'hi' ? 'एआई डॉक्टर' : 'AI Agri Doctor'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isSending && (
          <div className="flex items-center gap-2.5 text-xs text-forest-300 p-3 bg-surface-card/60 rounded-xl border border-surface-border w-fit animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            <span>
              {chatLang === 'hi' 
                ? 'एआई डॉक्टर उत्तर तैयार कर रहे हैं...' 
                : 'AI Doctor is preparing crop-care advice...'}
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Question Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-2 no-scrollbar">
        {(quickQuestions[chatLang] || quickQuestions.en).map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            className="px-3 py-1.5 rounded-xl bg-surface-card hover:bg-forest-900/60 border border-surface-border hover:border-forest-500/30 text-[11px] text-cream-200 whitespace-nowrap transition-colors shadow-sm"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <div className="flex items-center gap-2 bg-surface-card p-1.5 rounded-2xl border border-surface-border shadow-sm">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={chatLang === 'hi' ? 'दवा, छिड़काव या सावधानी के बारे में पूछें...' : (t.ask_anything || 'Ask about crop care, dosage, timing, precautions...')}
          className="flex-1 bg-transparent px-3 py-2 text-xs text-white placeholder-surface-muted outline-none"
        />
        <button
          disabled={!input.trim() || isSending}
          onClick={() => handleSend()}
          className="p-2.5 rounded-xl bg-forest hover:bg-forest-600 text-white transition-all disabled:opacity-40 shadow-sm"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
