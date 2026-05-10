import React, { useState } from "react";
import { assets } from "../assets/assets";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  FormControl,
  FormControlLabel,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddSharpIcon from "@mui/icons-material/AddSharp";
import DeleteOutlineSharpIcon from "@mui/icons-material/DeleteOutlineSharp";
import CloudUploadSharpIcon from "@mui/icons-material/CloudUploadSharp";
import { backendUrl, currency } from "../config";
import { toast } from "react-toastify";

const CATEGORY_OPTIONS = ["PC", "Laptop", "Tablet", "Gaming", "Audio", "Phone", "Accessory", "Wearable", "Camera"];
const SUB_CATEGORIES = [
  ["TopSeller", "Top Seller"],
  ["NewArrival", "New Arrival"],
  ["Sale", "Sale"],
];
const STATUS_OPTIONS = [
  ["active", "Active"],
  ["coming_soon", "Coming Soon"],
  ["discontinued", "Discontinued"],
];
const INITIAL_FORM = {
  name: "",
  description: "",
  status: "active",
  price: "",
  originalPrice: "",
  categories: ["PC"],
  subCategory: "TopSeller",
  bestSeller: false,
  models: [],
  tags: [],
  rating: "",
  reviewCount: "",
  stockQuantity: 0,
};

const markdownComponents = {
  p: ({ children }) => <Typography component="p" sx={{ mb: 1.5, lineHeight: 1.7 }}>{children}</Typography>,
  strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  ul: ({ children }) => <MarkdownList component="ul" type="disc">{children}</MarkdownList>,
  ol: ({ children }) => <MarkdownList component="ol" type="decimal">{children}</MarkdownList>,
  li: ({ children }) => <Box component="li" sx={{ mb: 0.5 }}>{children}</Box>,
  h1: ({ children }) => <Typography variant="h5" fontWeight={800} sx={{ mb: 1.5 }}>{children}</Typography>,
  h2: ({ children }) => <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>{children}</Typography>,
  h3: ({ children }) => <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>{children}</Typography>,
};

const cardSx = { borderRadius: 1.5, border: "1px solid", borderColor: "divider" };
const imageBoxSx = {
  width: 200,
  minWidth: 200,
  height: 200,
  display: "block",
  overflow: "hidden",
  borderRadius: 1,
  border: "1px dashed",
  borderColor: "divider",
  bgcolor: "grey.50",
  cursor: "pointer",
};
const imageSx = { width: 200, height: 200, display: "block", objectFit: "contain", bgcolor: "grey.50" };

const splitMeta = (items) => JSON.stringify(items);

export default function Add({ token }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [images, setImages] = useState(Array(4).fill(false));
  const [tagInput, setTagInput] = useState("");
  const [modelInput, setModelInput] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const resetForm = () => {
    setForm(INITIAL_FORM);
    setImages(Array(4).fill(false));
    setTagInput("");
    setModelInput("");
  };

  const addListItem = (field, input, setInput) => {
    const trimmed = input.trim();
    if (trimmed && !form[field].includes(trimmed)) update(field, [...form[field], trimmed]);
    setInput("");
  };
  const removeListItem = (field, item) => update(field, form[field].filter((value) => value !== item));
  const handleListKeyDown = (event, add) => {
    if (event.key === "Enter") {
      event.preventDefault();
      add();
    }
  };
  const toggleCategory = (category) => {
    update(
      "categories",
      form.categories.includes(category)
        ? form.categories.length === 1 ? form.categories : form.categories.filter((item) => item !== category)
        : [...form.categories, category]
    );
  };

  const handleMagicFill = async () => {
    if (!form.name.trim()) return toast.error("Enter a product name first");
    setIsGeneratingDescription(true);

    try {
      const response = await axios.post(
        backendUrl + "/api/product/generate-description",
        { name: form.name, categories: form.categories, tags: form.tags, models: form.models },
        { headers: { token } }
      );

      if (response.data.success) {
        update("description", response.data.description || "");
        toast.success("Description generated");
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const onSubmitHandler = async (event) => {
    event.preventDefault();
    setIsAdding(true);

    try {
      const formData = new FormData();
      Object.entries({
        name: form.name,
        description: form.description,
        status: form.status,
        price: form.price,
        originalPrice: form.originalPrice || form.price,
        category: JSON.stringify(form.categories),
        subCategory: form.subCategory,
        bestSeller: form.bestSeller,
        models: splitMeta(form.models),
        tags: splitMeta(form.tags),
        rating: form.rating || 0,
        reviewCount: form.reviewCount || 0,
        stockQuantity: form.stockQuantity,
      }).forEach(([key, value]) => formData.append(key, value));
      images.forEach((image, index) => image && formData.append(`image${index + 1}`, image));

      const response = await axios.post(backendUrl + "/api/product/add", formData, { headers: { token } });
      if (response.data.success) {
        toast.success(response.data.message);
        resetForm();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setIsAdding(false);
    }
  };

  const moneyFields = [
    ["price", "Price"],
    ["originalPrice", "Original Price"],
  ];
  const numberFields = [
    ["stockQuantity", "Stock Quantity", {}],
    ["rating", "Rating", { min: 0, max: 5, step: 0.1 }],
    ["reviewCount", "Review Count", { min: 0 }],
  ];

  return (
    <Box component="form" onSubmit={onSubmitHandler}>
      <PageHeader
        title="Add Product"
        subtitle="Create a new listing with media, markdown content, categories, and merchandising metadata."
      />

      <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", xl: "minmax(0, 1.9fr) minmax(360px, 0.95fr)" }, alignItems: "start" }}>
        <Stack spacing={2.5}>
          <FormCard title="Media">
            <Grid container spacing={2}>
              {images.map((image, index) => {
                const id = `image${index + 1}`;
                return (
                  <Grid item xs={6} sm={3} key={id}>
                    <Box component="label" htmlFor={id} sx={imageBoxSx}>
                      <Box component="img" src={image ? URL.createObjectURL(image) : assets.upload_area} alt="" sx={{ ...imageSx, p: image ? 1 : 0 }} />
                      <input id={id} hidden type="file" onChange={(event) => {
                        const nextImages = [...images];
                        nextImages[index] = event.target.files[0];
                        setImages(nextImages);
                      }} />
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </FormCard>

          <FormCard>
            <Stack spacing={2}>
              <TextField label="Product Name" value={form.name} onChange={(event) => update("name", event.target.value)} fullWidth required />
              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button variant="outlined" onClick={handleMagicFill} disabled={isGeneratingDescription}>
                  {isGeneratingDescription ? "Generating..." : "Magic Fill"}
                </Button>
              </Box>
              <TextField
                label="Description"
                value={form.description}
                onChange={(event) => update("description", event.target.value)}
                fullWidth
                required
                multiline
                minRows={7}
                placeholder={"**Key features**\n\n- Fast performance\n- Lightweight design\n- 2 year warranty"}
                helperText="Markdown is supported: bold, italic, bullet lists, and numbered lists."
              />
            </Stack>
          </FormCard>

          <FormCard title="Description Preview">
            <Box sx={{ minHeight: 220, borderRadius: 1, border: "1px solid", borderColor: "divider", bgcolor: "background.paper", p: 2 }}>
              {form.description.trim() ? (
                <ReactMarkdown components={markdownComponents}>{form.description}</ReactMarkdown>
              ) : (
                <Typography color="text.secondary">The formatted product description preview will appear here.</Typography>
              )}
            </Box>
          </FormCard>
        </Stack>

        <Stack spacing={2.5} sx={{ position: { xl: "sticky" }, top: { xl: 96 } }}>
          <FormCard title="Listing Setup">
            <Stack spacing={2}>
              <OptionSelect label="Sub Category" value={form.subCategory} options={SUB_CATEGORIES} onChange={(value) => update("subCategory", value)} />
              <OptionSelect label="Status" value={form.status} options={STATUS_OPTIONS} onChange={(value) => update("status", value)} />
              {moneyFields.map(([field, label]) => (
                <TextField key={field} label={label} type="number" value={form[field]} onChange={(event) => update(field, event.target.value)} InputProps={{ startAdornment: <InputAdornment position="start">{currency}</InputAdornment> }} />
              ))}
              {numberFields.map(([field, label, inputProps]) => (
                <TextField key={field} label={label} type="number" value={form[field]} onChange={(event) => update(field, event.target.value)} inputProps={inputProps} />
              ))}
              <FormControlLabel control={<Checkbox checked={form.bestSeller} onChange={() => update("bestSeller", !form.bestSeller)} />} label="Add to Best Seller" />
            </Stack>
          </FormCard>

          <FormCard title="Categories">
            <FormControl fullWidth>
              <InputLabel id="category-select-label">Categories</InputLabel>
              <Select labelId="category-select-label" multiple value={form.categories} label="Categories" renderValue={(selected) => selected.join(", ")}>
                {CATEGORY_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option} onClick={() => toggleCategory(option)}>
                    <Checkbox checked={form.categories.includes(option)} />
                    <Typography>{option}</Typography>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </FormCard>

          <ChipInput
            title="Models"
            label="Add model"
            color="success"
            items={form.models}
            input={modelInput}
            setInput={setModelInput}
            onAdd={() => addListItem("models", modelInput, setModelInput)}
            onDelete={(item) => removeListItem("models", item)}
            onKeyDown={(event) => handleListKeyDown(event, () => addListItem("models", modelInput, setModelInput))}
            emptyText="No models added yet."
          />
          <ChipInput
            title="Tags"
            label="Add tag"
            color="primary"
            items={form.tags}
            input={tagInput}
            setInput={setTagInput}
            onAdd={() => addListItem("tags", tagInput, setTagInput)}
            onDelete={(item) => removeListItem("tags", item)}
            onKeyDown={(event) => handleListKeyDown(event, () => addListItem("tags", tagInput, setTagInput))}
            emptyText="No tags added yet."
          />

          <Button type="submit" variant="contained" size="large" startIcon={<CloudUploadSharpIcon />} disabled={isAdding} sx={{ py: 1.4, borderRadius: 1, fontWeight: 700 }}>
            {isAdding ? "Adding..." : "Add Product"}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}

function PageHeader({ title, subtitle }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h4" fontWeight={800}>{title}</Typography>
      <Typography color="text.secondary" sx={{ mt: 0.75 }}>{subtitle}</Typography>
    </Box>
  );
}

function FormCard({ title, children }) {
  return (
    <Card elevation={0} sx={cardSx}>
      <CardContent>
        {title && <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>{title}</Typography>}
        {children}
      </CardContent>
    </Card>
  );
}

function OptionSelect({ label, value, options, onChange }) {
  return (
    <FormControl fullWidth>
      <InputLabel>{label}</InputLabel>
      <Select label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, optionLabel]) => (
          <MenuItem key={optionValue} value={optionValue}>{optionLabel}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

function ChipInput({ title, label, color, items, input, setInput, onAdd, onDelete, onKeyDown, emptyText }) {
  return (
    <FormCard title={title}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2 }}>
        <TextField label={label} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={onKeyDown} fullWidth />
        <Button variant="contained" startIcon={<AddSharpIcon />} onClick={onAdd}>Add</Button>
      </Stack>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {items.length ? (
          items.map((item, index) => (
            <Chip key={`${item}-${index}`} label={item} onDelete={() => onDelete(item)} deleteIcon={<DeleteOutlineSharpIcon />} color={color} variant="outlined" />
          ))
        ) : (
          <Typography color="text.secondary">{emptyText}</Typography>
        )}
      </Stack>
    </FormCard>
  );
}

function MarkdownList({ component, type, children }) {
  return (
    <Box component={component} sx={{ pl: 3, mb: 1.5, lineHeight: 1.7, listStyleType: type, "& li": { display: "list-item" } }}>
      {children}
    </Box>
  );
}
