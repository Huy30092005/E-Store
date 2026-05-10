import axios from "axios";

const OPENAI_API_URL =
  process.env.OPENAI_API_URL || "https://api.openai.com/v1/responses";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

const parseList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
};

const buildPrompt = ({ name, categories, tags, models }) =>
  [
    "Write a polished ecommerce product description in Markdown.",
    "Write between 100 and 150 words total.",
    "If the draft is under 100 words, expand it before responding.",
    "Do not return a single sentence or a short blurb.",
    "Use this structure:",
    "1. A short opening paragraph of 2 to 3 sentences.",
    "2. A bullet list with 4 to 6 key highlights.",
    "Keep it factual and persuasive, but do not invent specific technical specs, pricing, warranties, or compatibility claims that were not provided.",
    "Make the copy slightly richer and more descriptive than a short catalog blurb.",
    "Avoid headings like 'Product Description'.",
    "",
    `Product name: ${name.trim()}`,
    `Categories: ${categories.join(", ") || "N/A"}`,
    `Tags: ${tags.join(", ") || "N/A"}`,
    `Models: ${models.join(", ") || "N/A"}`,
  ].join("\n");

const extractDescription = (responseData) => {
  if (typeof responseData?.output_text === "string" && responseData.output_text.trim()) {
    return responseData.output_text.trim();
  }

  const responseOutput =
    responseData?.output
      ?.flatMap((item) => item?.content || [])
      ?.filter((item) => item?.type === "output_text" && item?.text)
      ?.map((item) => item.text)
      ?.join("")
      ?.trim() || "";

  if (responseOutput) {
    return responseOutput;
  }

  return (
    responseData?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim() || ""
  );
};

const generateProductDescription = async (req, res) => {
  try {
    const { name, categories = [], tags = [], models = [] } = req.body;

    if (!name?.trim()) {
      return res.json({ success: false, message: "Product name is required" });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.json({
        success: false,
        message: "OPENAI_API_KEY is not configured on the backend",
      });
    }

    const prompt = buildPrompt({
      name,
      categories: parseList(categories),
      tags: parseList(tags),
      models: parseList(models),
    });

    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: OPENAI_MODEL,
        input: [
          {
            role: "developer",
            content:
              "You write polished ecommerce product descriptions in Markdown and follow formatting instructions exactly.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.4,
        max_output_tokens: 500,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    const description = extractDescription(response.data);

    if (!description) {
      console.log("OpenAI response payload:", JSON.stringify(response.data, null, 2));
      return res.json({
        success: false,
        message: "OpenAI did not return a description",
      });
    }

    return res.json({ success: true, description });
  } catch (error) {
    console.log(error);
    return res.json({
      success: false,
      message: error.response?.data?.error?.message || error.message,
    });
  }
};

export default generateProductDescription;
