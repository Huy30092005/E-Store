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

const CATEGORY_OPTIONS = [
  "PC",
  "Laptop",
  "Tablet",
  "Gaming",
  "Audio",
  "Phone",
  "Accessory",
  "Wearable",
  "Camera",
];

const markdownComponents = {
  p: ({ children }) => (
    <Typography component="p" sx={{ mb: 1.5, lineHeight: 1.7 }}>
      {children}
    </Typography>
  ),
  strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  ul: ({ children }) => (
    <Box
      component="ul"
      sx={{
        pl: 3,
        mb: 1.5,
        lineHeight: 1.7,
        listStyleType: "disc",
        "& li": { display: "list-item" },
      }}
    >
      {children}
    </Box>
  ),
  ol: ({ children }) => (
    <Box
      component="ol"
      sx={{
        pl: 3,
        mb: 1.5,
        lineHeight: 1.7,
        listStyleType: "decimal",
        "& li": { display: "list-item" },
      }}
    >
      {children}
    </Box>
  ),
  li: ({ children }) => (
    <Box component="li" sx={{ mb: 0.5 }}>
      {children}
    </Box>
  ),
  h1: ({ children }) => (
    <Typography variant="h5" fontWeight={800} sx={{ mb: 1.5 }}>
      {children}
    </Typography>
  ),
  h2: ({ children }) => (
    <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>
      {children}
    </Typography>
  ),
  h3: ({ children }) => (
    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
      {children}
    </Typography>
  ),
};

const Add = ({ token }) => {
  const [image1, setImage1] = useState(false);
  const [image2, setImage2] = useState(false);
  const [image3, setImage3] = useState(false);
  const [image4, setImage4] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("active");
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [categories, setCategories] = useState(["PC"]);
  const [subCategory, setSubCategory] = useState("TopSeller");
  const [bestSeller, setBestSeller] = useState(false);
  const [models, setModels] = useState([]);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [modelInput, setModelInput] = useState("");
  const [rating, setRating] = useState("");
  const [reviewCount, setReviewCount] = useState("");
  const [stockQuantity, setStockQuantity] = useState(0);
  const [isAdding, setIsAdding] = useState(false);

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setTagInput("");
  };

  const removeTag = (tagToRemove) => {
    setTags((prev) => prev.filter((tag) => tag !== tagToRemove));
  };

  const handleTagKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  const addModel = () => {
    const trimmed = modelInput.trim();
    if (trimmed && !models.includes(trimmed)) {
      setModels((prev) => [...prev, trimmed]);
    }
    setModelInput("");
  };

  const removeModel = (modelToRemove) => {
    setModels((prev) => prev.filter((m) => m !== modelToRemove));
  };

  const handleModelKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addModel();
    }
  };

  const toggleCategory = (categoryOption) => {
    setCategories((prev) => {
      if (prev.includes(categoryOption)) {
        return prev.length === 1 ? prev : prev.filter((item) => item !== categoryOption);
      }

      return [...prev, categoryOption];
    });
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setStatus("active");
    setCategories(["PC"]);
    setSubCategory("TopSeller");
    setPrice("");
    setOriginalPrice("");
    setImage1(false);
    setImage2(false);
    setImage3(false);
    setImage4(false);
    setModels([]);
    setTags([]);
    setTagInput("");
    setModelInput("");
    setRating("");
    setReviewCount("");
    setBestSeller(false);
    setStockQuantity(0);
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    setIsAdding(true);

    try {
      const formData = new FormData();

      formData.append("name", name);
      formData.append("description", description);
      formData.append("status", status);
      formData.append("price", price);
      formData.append("originalPrice", originalPrice || price);
      formData.append("category", JSON.stringify(categories));
      formData.append("subCategory", subCategory);
      formData.append("bestSeller", bestSeller);
      formData.append("models", JSON.stringify(models));
      formData.append("tags", JSON.stringify(tags));
      formData.append("rating", rating || 0);
      formData.append("reviewCount", reviewCount || 0);
      formData.append("stockQuantity", stockQuantity);

      image1 && formData.append("image1", image1);
      image2 && formData.append("image2", image2);
      image3 && formData.append("image3", image3);
      image4 && formData.append("image4", image4);

      const response = await axios.post(
        backendUrl + "/api/product/add",
        formData,
        { headers: { token } }
      );

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

  const imageFields = [
    { id: "image1", value: image1, setter: setImage1 },
    { id: "image2", value: image2, setter: setImage2 },
    { id: "image3", value: image3, setter: setImage3 },
    { id: "image4", value: image4, setter: setImage4 },
  ];

  return (
    <Box component="form" onSubmit={onSubmitHandler}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800}>
          Add Product
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.75 }}>
          Create a new listing with media, markdown content, categories, and merchandising metadata.
        </Typography>
      </Box>

      <Box
        sx={{
          display: "grid",
          gap: 2.5,
          gridTemplateColumns: {
            xs: "1fr",
            xl: "minmax(0, 1.9fr) minmax(360px, 0.95fr)",
          },
          alignItems: "start",
        }}
      >
        <Stack spacing={2.5}>
            <Card elevation={0} sx={{ borderRadius: 1.5, border: "1px solid", borderColor: "divider" }}>
              <CardContent>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
                  Media
                </Typography>
                <Grid container spacing={2}>
                  {imageFields.map((field) => (
                    <Grid item xs={6} sm={3} key={field.id}>
                      <Box
                        component="label"
                        htmlFor={field.id}
                        sx={{
                          width: "200px",
                          minWidth: "200px",
                          height: "200px",
                          display: "block",
                          overflow: "hidden",
                          borderRadius: 1,
                          border: "1px dashed",
                          borderColor: "divider",
                          bgcolor: "grey.50",
                          cursor: "pointer",
                        }}
                      >
                        <Box
                          component="img"
                          src={!field.value ? assets.upload_area : URL.createObjectURL(field.value)}
                          alt=""
                          sx={{
                            width: "200px",
                            height: "200px",
                            display: "block",
                            objectFit: "contain",
                            p: field.value ? 1 : 0,
                            bgcolor: "grey.50",
                          }}
                        />
                        <input
                          id={field.id}
                          hidden
                          type="file"
                          onChange={(e) => field.setter(e.target.files[0])}
                        />
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>

            <Card elevation={0} sx={{ borderRadius: 1.5, border: "1px solid", borderColor: "divider" }}>
              <CardContent>
                <Stack spacing={2}>
                  <TextField
                    label="Product Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    fullWidth
                    required
                  />
                  <TextField
                    label="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    fullWidth
                    required
                    multiline
                    minRows={7}
                    placeholder={"**Key features**\n\n- Fast performance\n- Lightweight design\n- 2 year warranty"}
                    helperText="Markdown is supported: bold, italic, bullet lists, and numbered lists."
                  />
                </Stack>
              </CardContent>
            </Card>

            <Card elevation={0} sx={{ borderRadius: 1.5, border: "1px solid", borderColor: "divider" }}>
              <CardContent>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
                  Description Preview
                </Typography>
                <Box
                  sx={{
                    minHeight: 220,
                    borderRadius: 1,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.paper",
                    p: 2,
                  }}
                >
                  {description.trim() ? (
                    <ReactMarkdown components={markdownComponents}>{description}</ReactMarkdown>
                  ) : (
                    <Typography color="text.secondary">
                      The formatted product description preview will appear here.
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
        </Stack>

        <Stack
          spacing={2.5}
          sx={{
            position: { xl: "sticky" },
            top: { xl: 96 },
          }}
        >
            <Card elevation={0} sx={{ borderRadius: 1.5, border: "1px solid", borderColor: "divider" }}>
              <CardContent>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
                  Listing Setup
                </Typography>
                <Stack spacing={2}>
                  <FormControl fullWidth>
                    <InputLabel>Sub Category</InputLabel>
                    <Select
                      label="Sub Category"
                      value={subCategory}
                      onChange={(e) => setSubCategory(e.target.value)}
                    >
                      <MenuItem value="TopSeller">Top Seller</MenuItem>
                      <MenuItem value="NewArrival">New Arrival</MenuItem>
                      <MenuItem value="Sale">Sale</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      label="Status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="coming_soon">Coming Soon</MenuItem>
                      <MenuItem value="discontinued">Discontinued</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    label="Price"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start">{currency}</InputAdornment> }}
                  />
                  <TextField
                    label="Original Price"
                    type="number"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start">{currency}</InputAdornment> }}
                  />
                  <TextField
                    label="Stock Quantity"
                    type="number"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                  />
                  <TextField
                    label="Rating"
                    type="number"
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                    inputProps={{ min: 0, max: 5, step: 0.1 }}
                  />
                  <TextField
                    label="Review Count"
                    type="number"
                    value={reviewCount}
                    onChange={(e) => setReviewCount(e.target.value)}
                    inputProps={{ min: 0 }}
                  />
                  <FormControlLabel
                    control={<Checkbox checked={bestSeller} onChange={() => setBestSeller((prev) => !prev)} />}
                    label="Add to Best Seller"
                  />
                </Stack>
              </CardContent>
            </Card>

            <Card elevation={0} sx={{ borderRadius: 1.5, border: "1px solid", borderColor: "divider" }}>
              <CardContent>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
                  Categories
                </Typography>
                <FormControl fullWidth>
                  <InputLabel id="category-select-label">Categories</InputLabel>
                  <Select
                    labelId="category-select-label"
                    multiple
                    value={categories}
                    label="Categories"
                    renderValue={(selected) => selected.join(", ")}
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <MenuItem key={option} value={option} onClick={() => toggleCategory(option)}>
                        <Checkbox checked={categories.includes(option)} />
                        <Typography>{option}</Typography>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </CardContent>
            </Card>

            <Card elevation={0} sx={{ borderRadius: 1.5, border: "1px solid", borderColor: "divider" }}>
              <CardContent>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
                  Models
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2 }}>
                  <TextField
                    label="Add model"
                    value={modelInput}
                    onChange={(e) => setModelInput(e.target.value)}
                    onKeyDown={handleModelKeyDown}
                    fullWidth
                  />
                  <Button variant="contained" startIcon={<AddSharpIcon />} onClick={addModel}>
                    Add
                  </Button>
                </Stack>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {models.length ? (
                    models.map((model, index) => (
                      <Chip
                        key={`${model}-${index}`}
                        label={model}
                        onDelete={() => removeModel(model)}
                        deleteIcon={<DeleteOutlineSharpIcon />}
                        color="success"
                        variant="outlined"
                      />
                    ))
                  ) : (
                    <Typography color="text.secondary">No models added yet.</Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>

            <Card elevation={0} sx={{ borderRadius: 1.5, border: "1px solid", borderColor: "divider" }}>
              <CardContent>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
                  Tags
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2 }}>
                  <TextField
                    label="Add tag"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    fullWidth
                  />
                  <Button variant="contained" startIcon={<AddSharpIcon />} onClick={addTag}>
                    Add
                  </Button>
                </Stack>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {tags.length ? (
                    tags.map((tag, index) => (
                      <Chip
                        key={`${tag}-${index}`}
                        label={tag}
                        onDelete={() => removeTag(tag)}
                        deleteIcon={<DeleteOutlineSharpIcon />}
                        color="primary"
                        variant="outlined"
                      />
                    ))
                  ) : (
                    <Typography color="text.secondary">No tags added yet.</Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>

            <Button
              type="submit"
              variant="contained"
              size="large"
              startIcon={<CloudUploadSharpIcon />}
              disabled={isAdding}
              sx={{ py: 1.4, borderRadius: 1, fontWeight: 700 }}
            >
              {isAdding ? "Adding..." : "Add Product"}
            </Button>
        </Stack>
      </Box>
    </Box>
  );
};

export default Add;
