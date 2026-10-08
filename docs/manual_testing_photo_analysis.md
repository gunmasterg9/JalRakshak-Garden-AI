# Manual Testing Guide: Plant Photo Analysis & AI Plant Doctor 🌱🩺

This guide provides end-to-end instructions for testing the **AI Plant Doctor** feature in **JalRakshak Garden AI**, covering both **Vision AI (Ollama)** and **Offline Rule Fallback** modes.

---

## 1. Overview of Photo Analysis Workflow

1. **User input**: Select an existing plant or type a custom plant name.
2. **Photo input**: Upload an image (JPG, PNG, WEBP up to 7 MB) or use device camera.
3. **Symptoms input**: Optional text describing symptoms (e.g. *"lower leaves turning yellow with brown spots"*).
4. **Backend processing**:
   - If Ollama is running with a vision model (e.g. `gemma4:12b`, `gemma3:4b`), base64 image data is passed to `/api/generate`.
   - If Ollama is offline or model lacks vision capability, the backend automatically transitions to **deterministic symptom-based offline rules**, returning a helpful `vision_note` and safe non-toxic recommendations.
5. **Output**: Structured diagnosis with confidence, causes, non-chemical remedies, water advice, and one-click saving to **Garden Journal**.

---

## 2. Test Cases

### Test Case 1: Photo Analysis with Local Vision AI (Online)

**Prerequisites:**
1. Ollama is installed and running (`ollama serve`).
2. A vision-compatible model is pulled:
   ```bash
   ollama pull gemma4:12b
   # or
   ollama pull gemma3:4b
   ```
3. Backend model is set to `gemma4:12b` (configured in Settings or `.env`).

**Steps:**
1. Open JalRakshak in your browser: `http://127.0.0.1:5173`.
2. Navigate to **Plant Doctor** via the sidebar or header.
3. Choose a plant from the dropdown (e.g., **Tomato**) or enter a plant name.
4. Upload a photo of a plant leaf showing visible symptoms (or drop any sample plant image).
5. Type in symptoms: *"Yellowing edges on lower leaves, soil feels very dry."*
6. Click **Run AI Diagnosis**.

**Expected Result:**
- Button shows *"Analyzing on Local AI..."* spinner.
- Returns a structured diagnosis card with:
  - Source badge: `local vision AI · gemma4:12b`
  - Visible symptoms identified
  - Suspected causes (e.g. moisture stress, nutrient deficiency)
  - Practical non-chemical actions (mulching, soil moisture check)
  - Specific watering advice
  - Button to **Save to Garden Journal**.

---

### Test Case 2: Graceful Vision Fallback (Ollama Offline)

**Steps:**
1. Stop Ollama or ensure port 11434 is closed.
2. Navigate to **Plant Doctor** (`http://127.0.0.1:5173/doctor`).
3. Upload any plant photo.
4. Enter symptoms: *"Leaves are wilting and drooping in afternoon heat."*
5. Click **Run AI Diagnosis**.

**Expected Result:**
- No 500 error or crash.
- Diagnosis returns immediately with:
  - Source badge: `offline symptom rules (vision fallback)`
  - Informative banner: *"Local model could not process the image or vision is not supported on this model. Showing symptom-based safe guidance instead."*
  - Rule-based diagnosis based on described symptoms (heat stress vs overwatering check).

---

### Test Case 3: Symptom-Only Diagnosis (No Photo Attached)

**Steps:**
1. Open **Plant Doctor**.
2. Leave the photo dropzone empty.
3. Describe symptoms: *"Leaves have white powdery mildew on the undersides."*
4. Click **Run AI Diagnosis**.

**Expected Result:**
- Diagnosis processes successfully based on the symptom rule engine.
- Identifies fungal/mildew risk and provides organic cultural controls (spacing, airflow, avoiding overhead watering).

---

### Test Case 4: File Validation & Error Handling

| Scenario | Input | Expected Behavior |
|---|---|---|
| **Empty submission** | No photo and no symptoms | Error banner: *"Please either upload a plant photo or enter observed symptoms."* (HTTP 400) |
| **Invalid file format** | Upload a non-image file (e.g. PDF/TXT) | HTTP 400 error: *"Please upload a valid image (JPEG, PNG, WEBP)."* |
| **Oversized photo** | Image file > 7 MB | Immediate UI alert & backend HTTP 413: *"Image exceeds maximum size of 7 MB."* |

---

### Test Case 5: Journal Persistence Integration

**Steps:**
1. After running any diagnosis in **Plant Doctor**, click **Save to Garden Journal**.
2. Notice the button updates to *"Saved to Garden Journal ✓"*.
3. Navigate to **Garden Journal** (`http://127.0.0.1:5173/journal`).
4. Verify the diagnosis entry appears in the chronological timeline with plant name, symptoms, and care recommendation.

---

## 3. Automated Verification

To run automated API tests for all photo analysis pathways:
```bash
pytest backend/tests/test_api.py -k "analyze_photo" -v
```
All tests verify input validation, offline fallbacks, and vision error handling.
