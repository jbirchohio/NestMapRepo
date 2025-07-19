# 🔑 NestMap API Setup Guide

## 🎯 **Voice Interface - How It Works**

### **Frontend Voice Recognition (No API Required)**
The voice interface uses **native browser APIs** that work without external services:

```typescript
// Uses Web Speech API (built into modern browsers)
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
const synthesis = window.speechSynthesis;
```

**How Voice Works:**
1. **Speech-to-Text**: Browser's Web Speech API converts voice to text
2. **Command Processing**: Text sent to backend for AI processing
3. **AI Response**: OpenAI GPT-4 generates intelligent responses
4. **Text-to-Speech**: Browser speaks the response back

**Voice Features Available Without APIs:**
- ✅ Basic voice recognition and speech synthesis
- ✅ Command parsing and text responses
- ❌ AI-powered intelligent responses (needs OpenAI)
- ❌ Real-time data (weather, flights, etc.)

## 🔧 **Required API Keys by Priority**

### **🚨 CRITICAL (Core Functionality)**

#### 1. **OpenAI API** - Voice Intelligence & AI Features
```bash
OPENAI_API_KEY="sk-your_openai_api_key"
```
- **Purpose**: AI-powered responses for voice interface, trip recommendations
- **Cost**: ~$0.002 per 1K tokens (very affordable)
- **Get it**: https://platform.openai.com/api-keys
- **Without it**: Voice works but gives basic responses only

#### 2. **Database** - Already Configured ✅
```bash
DATABASE_URL="your_supabase_connection_string"
```
- **Status**: ✅ Already working with Supabase
- **Purpose**: Store trips, users, expenses, bookings

### **⚡ HIGH PRIORITY (Phase 1-3 Features)**

#### 3. **OpenWeatherMap API** - Weather Data
```bash
OPENWEATHER_API_KEY="your_openweather_api_key"
```
- **Purpose**: Real-time weather for voice interface and smart city dashboard
- **Cost**: Free tier (1000 calls/day)
- **Get it**: https://openweathermap.org/api
- **Without it**: Weather commands return mock data

#### 4. **AviationStack API** - Flight Data
```bash
AVIATIONSTACK_API_KEY="your_aviationstack_api_key"
```
- **Purpose**: Real-time flight status and tracking
- **Cost**: Free tier (1000 calls/month)
- **Get it**: https://aviationstack.com/
- **Without it**: Flight status returns mock data

#### 5. **NewsAPI** - Travel News & Sentiment
```bash
NEWS_API_KEY="your_news_api_key"
```
- **Purpose**: Aviation news and travel disruption analysis
- **Cost**: Free tier (1000 requests/day)
- **Get it**: https://newsapi.org/
- **Without it**: News analysis returns mock data

### **📈 MEDIUM PRIORITY (Enterprise Features)**

#### 6. **Enterprise Integrations** - HR/Finance Systems
```bash
# HR Systems (Optional)
WORKDAY_API_KEY="your_workday_api_key"
BAMBOOHR_API_KEY="your_bamboohr_api_key"
ADP_API_KEY="your_adp_api_key"

# Finance Systems (Optional)
SAP_API_KEY="your_sap_api_key"
NETSUITE_API_KEY="your_netsuite_api_key"
```
- **Purpose**: Enterprise integration dashboard functionality
- **Cost**: Varies by provider
- **Without it**: Enterprise features show mock data

### **🚀 LOW PRIORITY (Advanced Features)**

#### 7. **Smart City & IoT** - Advanced Integrations
```bash
SMART_CITY_API_KEY="your_smart_city_api_key"
GOOGLE_MAPS_API_KEY="your_google_maps_api_key"
```
- **Purpose**: Smart city dashboard and IoT device monitoring
- **Cost**: Varies by provider
- **Without it**: Smart city features show mock data

#### 8. **Autonomous Vehicles** - Future Features
```bash
WAYMO_API_KEY="your_waymo_api_key"
UBER_API_KEY="your_uber_api_key"
```
- **Purpose**: Autonomous vehicle booking system
- **Cost**: Enterprise pricing
- **Without it**: AV booking shows mock vehicles

## 🎯 **Recommended Setup Order**

### **Phase 1: Get Voice Working (15 minutes)**
1. **OpenAI API Key** - Enable intelligent voice responses
   ```bash
   OPENAI_API_KEY="sk-your_openai_api_key"
   ```

### **Phase 2: Add Real Data (30 minutes)**
2. **Weather API** - Real weather data
   ```bash
   OPENWEATHER_API_KEY="your_openweather_api_key"
   ```

3. **Flight API** - Real flight status
   ```bash
   AVIATIONSTACK_API_KEY="your_aviationstack_api_key"
   ```

4. **News API** - Travel news analysis
   ```bash
   NEWS_API_KEY="your_news_api_key"
   ```

### **Phase 3: Enterprise Features (Optional)**
5. Add HR/Finance integrations as needed
6. Configure smart city APIs for advanced features

## 🔧 **Quick Setup Instructions**

### **1. Copy Environment File**
```bash
cp .env.example .env
```

### **2. Add Critical API Keys**
Edit `.env` and add at minimum:
```bash
# CRITICAL - For AI voice responses
OPENAI_API_KEY="sk-your_actual_openai_key"

# HIGH PRIORITY - For real data
OPENWEATHER_API_KEY="your_actual_weather_key"
AVIATIONSTACK_API_KEY="your_actual_flight_key"
NEWS_API_KEY="your_actual_news_key"
```

### **3. Restart Server**
```bash
npm run dev
```

## 💡 **Cost Breakdown (Monthly)**

### **Free Tier Usage**
- **OpenWeatherMap**: Free (1000 calls/day)
- **AviationStack**: Free (1000 calls/month)
- **NewsAPI**: Free (1000 requests/day)
- **Total**: $0/month for basic usage

### **Paid Usage (Recommended)**
- **OpenAI**: ~$10-50/month (depending on usage)
- **Weather**: ~$5-20/month (higher limits)
- **Flight**: ~$10-30/month (higher limits)
- **Total**: ~$25-100/month for production usage

## 🚨 **What Happens Without API Keys**

### **Voice Interface Behavior:**
- ✅ **Speech Recognition**: Works (uses browser)
- ✅ **Basic Commands**: Works (hardcoded responses)
- ❌ **AI Responses**: Falls back to simple text
- ❌ **Real Data**: Shows mock weather/flights

### **Smart City Dashboard:**
- ✅ **UI Components**: All work perfectly
- ❌ **Real Data**: Shows mock IoT/city data
- ✅ **Visualizations**: Charts work with mock data

### **Enterprise Features:**
- ✅ **Interface**: All dashboards work
- ❌ **Real Integrations**: Shows mock HR/finance data
- ✅ **Report Builder**: Works with sample data

## 🎯 **Minimum Viable Setup**

**For Demo/Testing:**
```bash
# Just add this one key for intelligent voice responses
OPENAI_API_KEY="sk-your_openai_api_key"
```

**For Production:**
```bash
# Add these 4 keys for full Phase 1-3 functionality
OPENAI_API_KEY="sk-your_openai_api_key"
OPENWEATHER_API_KEY="your_openweather_api_key"
AVIATIONSTACK_API_KEY="your_aviationstack_api_key"
NEWS_API_KEY="your_news_api_key"
```

## 🔗 **API Provider Links**

| Service | Free Tier | Paid Plans | Signup Link |
|---------|-----------|------------|-------------|
| OpenAI | $5 credit | $0.002/1K tokens | https://platform.openai.com |
| OpenWeatherMap | 1K calls/day | $40/month | https://openweathermap.org |
| AviationStack | 1K calls/month | $10/month | https://aviationstack.com |
| NewsAPI | 1K requests/day | $449/month | https://newsapi.org |

## 🎉 **Ready to Go!**

Your NestMap platform will work with **any combination** of these APIs:
- **No APIs**: Basic functionality with mock data
- **OpenAI only**: Intelligent voice with mock data
- **All APIs**: Full production functionality

The platform gracefully handles missing APIs and provides fallback data, so you can start with minimal setup and add APIs as needed!
