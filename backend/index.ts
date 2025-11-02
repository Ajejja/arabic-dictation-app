import dotenv from "dotenv";
dotenv.config();

import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuid } from "uuid";
import OpenAI from "openai";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname } from "path";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());

// Use Render’s writable temp directory
const uploadsDir = path.join("/tmp", "uploads");
const outputsDir = path.join("/tmp", "outputs");

app.use("/outputs", express.static(outputsDir));
app.use(cors());

let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
	// safe to instantiate
	openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
} else {
	console.warn("Warning: OPENAI_API_KEY is not set. /dictate/upload will return an error until configured.");
}

// ensure folders exist to avoid write errors
[uploadsDir, outputsDir].forEach((d) => {
	if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// storage for uploads
const upload = multer({
  storage: multer.diskStorage({
    // destination must be a function for diskStorage
    destination: (_, __, cb) => cb(null, uploadsDir),
    filename: (_, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname)}`)
  }),
  // limit size to 20MB and accept audio mimetypes only
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (!file.mimetype.startsWith("audio/")) {
      return cb(new Error("Only audio files are allowed"));
    }
    cb(null, true);
  }
});

// --- Helpers ---
function makeArabicParagraph(text: string) {
  return new Paragraph({
    bidirectional: true, // RTL
    children: [
      new TextRun({
        text,
        font: "Arial",  // Word will fallback if not found; Arial supports Arabic shaping
        size: 24,       // ~12pt
      }),
    ],
  });
}

// Optional: simple “voice commands” to add structure while speaking
// e.g., say: "عنوان: ..." → big bold heading
function postProcessArabic(text: string) {
  // Normalize common prefixes
  return text
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitToParagraphs(text: string): string[] {
  // Split on double newline or long pauses you might inject later
  return text.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
}

// --- Routes ---

// simple health endpoint
app.get("/health", (_, res) => res.json({ status: "ok" }));

// Upload audio, transcribe to Arabic, build .docx, return URL
app.post("/dictate/upload", upload.single("audio"), async (req, res) => {
	try {
		if (!req.file) return res.status(400).json({ error: "No audio uploaded" });

		// ensure OpenAI client is configured
		if (!openai) {
			return res.status(500).json({
				error: "OpenAI API key not configured. Set OPENAI_API_KEY environment variable."
			});
		}

		// Transcribe with Whisper (Arabic)
		const transcription = await openai.audio.transcriptions.create({
			file: fs.createReadStream(req.file.path),
			model: "whisper-1",
		});

		const arabicText = postProcessArabic(transcription.text || "");
		if (!arabicText) {
			return res.status(422).json({ error: "Transcription empty" });
		}
		const paras = splitToParagraphs(arabicText);

		// Build .docx
		const doc = new Document({
			sections: [
				{
					properties: { },
					children: paras.length
						? paras.map(p => {
								// voice-commands: heading if starts with "عنوان:" or "見出し:"
								if (/^\s*عنوان\s*[:：]/.test(p)) {
									const title = p.replace(/^\s*عنوان\s*[:：]\s*/,'').trim();
									return new Paragraph({
										bidirectional: true,
										spacing: { after: 200 },
										children: [new TextRun({ text: title, bold: true, size: 32, font: "Arial" })]
									});
								}
								// bullet if starts with "- " or "• "
								if (/^\s*(-|•)\s+/.test(p)) {
									return new Paragraph({
										bidirectional: true,
										bullet: { level: 0 },
										children: [new TextRun({ text: p.replace(/^\s*(-|•)\s+/, ""), font: "Arial" })]
									});
								}
								return makeArabicParagraph(p);
							})
						: [makeArabicParagraph("— لا يوجد نص —")]
				}
			]
		});

		const id = uuid();
		const outFilename = `dictation-${id}.docx`;
		const outPath = path.join(outputsDir, outFilename);
		const buffer = await Packer.toBuffer(doc);
		fs.writeFileSync(outPath, buffer);

		// produce full URL (works behind proxies if forwarded properly)
		const protocol = req.protocol || "http";
		const host = req.get("host") || `localhost:${PORT}`;
		const fileUrl = `${protocol}://${host}/outputs/${outFilename}`;

		console.log(`Created ${outPath}`);

		res.json({ url: fileUrl, textPreview: arabicText.slice(0, 400) + "…" });
	} catch (err: any) {
		console.error("Dictation error:", err?.response?.data || err?.message || err);
		res.status(500).json({ error: "Failed to create document" });
	} finally {
		// cleanup uploaded file if present
		try {
			if (req.file && req.file.path && fs.existsSync(req.file.path)) {
				fs.unlinkSync(req.file.path);
			}
		} catch (e) {
			console.warn("Failed to delete uploaded file:", e);
		}
	}
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
app.get("/", (_, res) => res.send("Arabic dictation server ready ✅"));
app.listen(PORT, () => console.log(`🚀 Server on http://localhost:${PORT}`));
