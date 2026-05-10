import React, { useCallback, useEffect, useState } from "react";
import { backendUrl, currency } from "../config";
import { toast } from "react-toastify";
import axios from "axios";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import EditSharpIcon from "@mui/icons-material/EditSharp";
import DeleteOutlineSharpIcon from "@mui/icons-material/DeleteOutlineSharp";
import SellSharpIcon from "@mui/icons-material/SellSharp";

const CATEGORY_OPTIONS = ["PC", "Laptop", "Gaming", "Audio", "Phone", "Accessory", "Wearable", "Camera"];
const SUB_CATEGORIES = [
  ["TopSeller", "Top Seller"],
  ["NewArrival", "New Arrival"],
  ["Sale", "Sale"],
];
const STATUS_OPTIONS = [
  { value: "active", label: "Active", color: "success" },
  { value: "coming_soon", label: "Coming Soon", color: "warning" },
  { value: "discontinued", label: "Discontinued", color: "default" },
];
const EMPTY_FORM = {
  id: "",
  name: "",
  description: "",
  status: "active",
  price: "",
  originalPrice: "",
  stockQuantity: "",
  category: [],
  subCategory: "TopSeller",
  models: "",
  tags: "",
  rating: "",
  reviewCount: "",
  bestSeller: false,
};
const CARD_SX = {
  borderRadius: 4,
  border: "1px solid",
  borderColor: "divider",
  boxShadow: "0 16px 40px rgba(15, 23, 42, 0.06)",
};

const csvToJson = (value) => JSON.stringify(value.split(",").map((item) => item.trim()).filter(Boolean));
const statusMeta = (status = "active") => STATUS_OPTIONS.find((option) => option.value === status) || STATUS_OPTIONS[0];
const normalizeCategories = (category) => (Array.isArray(category) ? category : [category].filter(Boolean));
const toEditForm = (item) => ({
  ...EMPTY_FORM,
  id: item._id,
  name: item.name || "",
  description: item.description || "",
  status: item.status || "active",
  price: item.price ?? "",
  originalPrice: item.originalPrice ?? "",
  stockQuantity: item.stockQuantity ?? 0,
  category: normalizeCategories(item.category),
  subCategory: item.subCategory || "TopSeller",
  models: Array.isArray(item.models) ? item.models.join(", ") : "",
  tags: Array.isArray(item.tags) ? item.tags.join(", ") : "",
  rating: item.rating ?? "",
  reviewCount: item.reviewCount ?? "",
  bestSeller: Boolean(item.bestSeller),
});

export default function List({ token }) {
  const [list, setList] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalProducts, setTotalProducts] = useState(0);
  const [editingProductId, setEditingProductId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  const fetchList = useCallback(async (nextPage = page, nextRowsPerPage = rowsPerPage) => {
    try {
      const response = await axios.get(backendUrl + "/api/product/list", {
        params: { page: nextPage + 1, limit: nextRowsPerPage },
      });

      if (response.data.success) {
        setList(response.data.products);
        setTotalProducts(response.data.pagination?.totalProducts || 0);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  }, [page, rowsPerPage]);

  const removeProduct = async (id) => {
    try {
      const response = await axios.post(backendUrl + "/api/product/remove", { id }, { headers: { token } });
      if (!response.data.success) return toast.error(response.data.message);

      toast.success(response.data.message);
      const nextPage = list.length === 1 && page > 0 ? page - 1 : page;
      if (nextPage !== page) setPage(nextPage);
      await fetchList(nextPage, rowsPerPage);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(Number(event.target.value));
    setPage(0);
  };
  const startEdit = (item) => {
    setEditingProductId(item._id);
    setEditForm(toEditForm(item));
  };
  const cancelEdit = () => {
    setEditingProductId("");
    setEditForm(EMPTY_FORM);
  };
  const handleEditChange = (field, value) => setEditForm((prev) => ({ ...prev, [field]: value }));
  const toggleCategory = (category) => {
    setEditForm((prev) => {
      const next = prev.category.includes(category)
        ? prev.category.filter((item) => item !== category)
        : [...prev.category, category];
      return { ...prev, category: next.length ? next : prev.category };
    });
  };

  const saveProduct = async () => {
    setIsSaving(true);
    try {
      const response = await axios.post(
        backendUrl + "/api/product/update",
        {
          ...editForm,
          category: JSON.stringify(editForm.category),
          models: csvToJson(editForm.models),
          tags: csvToJson(editForm.tags),
        },
        { headers: { token } }
      );

      if (response.data.success) {
        toast.success(response.data.message);
        await fetchList();
        cancelEdit();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    fetchList(page, rowsPerPage);
  }, [fetchList, page, rowsPerPage]);

  return (
    <Box>
      <PageHeader
        title="Product List"
        subtitle="Review inventory, update product records, and clean up older listings."
      />

      <TablePagination
        component="div"
        count={totalProducts}
        page={page}
        onPageChange={(_, nextPage) => setPage(nextPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[10, 25, 50]}
      />

      <Card elevation={0} sx={CARD_SX}>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table sx={{ minWidth: 820 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "grey.50" }}>
                  {["Image", "Name", "Category", "Status", "Price", "Stock", "Actions"].map((heading) => (
                    <TableCell key={heading} align={["Price", "Stock"].includes(heading) ? "right" : heading === "Actions" ? "center" : "left"}>
                      {heading}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {list.map((item) => (
                  <ProductRow
                    key={item._id}
                    item={item}
                    onEdit={startEdit}
                    onDelete={removeProduct}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <EditProductDialog
        open={Boolean(editingProductId)}
        form={editForm}
        isSaving={isSaving}
        onCancel={cancelEdit}
        onChange={handleEditChange}
        onToggleCategory={toggleCategory}
        onSave={saveProduct}
      />
    </Box>
  );
}

function ProductRow({ item, onEdit, onDelete }) {
  const status = statusMeta(item.status);

  return (
    <TableRow hover>
      <TableCell sx={{ width: 88 }}>
        <Box component="img" src={item.image?.[0]} alt={item.name} sx={{ width: 52, height: 52, objectFit: "cover", borderRadius: 2.5, border: "1px solid", borderColor: "divider" }} />
      </TableCell>
      <TableCell>
        <Stack spacing={0.5}>
          <Typography fontWeight={700}>{item.name}</Typography>
          {item.bestSeller && <Chip icon={<SellSharpIcon />} label="Best Seller" size="small" color="warning" variant="outlined" sx={{ width: "fit-content" }} />}
        </Stack>
      </TableCell>
      <TableCell>
        <Typography color="text.secondary">{normalizeCategories(item.category).join(", ")}</Typography>
      </TableCell>
      <TableCell>
        <Chip label={status.label} color={status.color} size="small" variant="outlined" />
      </TableCell>
      <TableCell align="right">{currency}{item.price}</TableCell>
      <TableCell align="right">{item.stockQuantity}</TableCell>
      <TableCell align="center">
        <Tooltip title="Edit">
          <IconButton onClick={() => onEdit(item)} color="primary"><EditSharpIcon /></IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton onClick={() => onDelete(item._id)} color="error"><DeleteOutlineSharpIcon /></IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}

function EditProductDialog({ open, form, isSaving, onCancel, onChange, onToggleCategory, onSave }) {
  const textFields = [
    { field: "name", label: "Product Name", xs: 12 },
    { field: "description", label: "Description", xs: 12, multiline: true, minRows: 4 },
    { field: "price", label: "Price", xs: 12, md: 6, money: true },
    { field: "originalPrice", label: "Original Price", xs: 12, md: 6, money: true },
    { field: "stockQuantity", label: "Stock Quantity", xs: 12, md: 6, type: "number" },
    { field: "models", label: "Models", xs: 12, md: 6, placeholder: "Comma separated" },
    { field: "tags", label: "Tags", xs: 12, md: 6, placeholder: "Comma separated" },
    { field: "rating", label: "Rating", xs: 12, md: 6, type: "number", inputProps: { min: 0, max: 5, step: 0.1 } },
    { field: "reviewCount", label: "Review Count", xs: 12, md: 6, type: "number", inputProps: { min: 0 } },
  ];

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="md">
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" fontWeight={800}>Edit Product</Typography>
        <Typography variant="body2" color="text.secondary">Update pricing, stock, content, and merchandising details.</Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0.25 }}>
          {textFields.map(({ field, label, xs, md, money, ...props }) => (
            <Grid item xs={xs} md={md} key={field}>
              <TextField
                label={label}
                value={form[field]}
                onChange={(event) => onChange(field, event.target.value)}
                fullWidth
                type={props.type || (money ? "number" : undefined)}
                InputProps={money ? { startAdornment: <InputAdornment position="start">{currency}</InputAdornment> } : undefined}
                {...props}
              />
            </Grid>
          ))}
          <Grid item xs={12} md={6}>
            <OptionSelect label="Status" value={form.status} options={STATUS_OPTIONS.map(({ value, label }) => [value, label])} onChange={(value) => onChange("status", value)} />
          </Grid>
          <Grid item xs={12} md={6}>
            <OptionSelect label="Sub Category" value={form.subCategory} options={SUB_CATEGORIES} onChange={(value) => onChange("subCategory", value)} />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControlLabel control={<Checkbox checked={form.bestSeller} onChange={() => onChange("bestSeller", !form.bestSeller)} />} label="Best Seller" />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Categories</Typography>
            <FormGroup row>
              {CATEGORY_OPTIONS.map((option) => (
                <FormControlLabel
                  key={option}
                  control={<Checkbox checked={form.category.includes(option)} onChange={() => onToggleCategory(option)} />}
                  label={option}
                />
              ))}
            </FormGroup>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onCancel} color="inherit">Cancel</Button>
        <Button onClick={onSave} variant="contained" disabled={isSaving}>{isSaving ? "Saving..." : "Save Changes"}</Button>
      </DialogActions>
    </Dialog>
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
