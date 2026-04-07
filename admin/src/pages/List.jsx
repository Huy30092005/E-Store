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

const CATEGORY_OPTIONS = [
  "PC",
  "Laptop",
  "Gaming",
  "Audio",
  "Phone",
  "Accessory",
  "Wearable",
  "Camera",
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

const STATUS_OPTIONS = [
  { value: "active", label: "Active", color: "success" },
  { value: "coming_soon", label: "Coming Soon", color: "warning" },
  { value: "discontinued", label: "Discontinued", color: "default" },
];

const List = ({ token }) => {
  const [list, setList] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalProducts, setTotalProducts] = useState(0);
  const [editingProductId, setEditingProductId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  const fetchList = useCallback(
    async (nextPage = page, nextRowsPerPage = rowsPerPage) => {
      try {
        const response = await axios.get(backendUrl + "/api/product/list", {
          params: {
            page: nextPage + 1,
            limit: nextRowsPerPage,
          },
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
    },
    [page, rowsPerPage]
  );

  const removeProduct = async (id) => {
    try {
      const response = await axios.post(
        backendUrl + "/api/product/remove",
        { id },
        { headers: { token } }
      );

      if (response.data.success) {
        toast.success(response.data.message);
        const isLastItemOnPage = list.length === 1 && page > 0;
        const nextPage = isLastItemOnPage ? page - 1 : page;

        if (isLastItemOnPage) {
          setPage(nextPage);
        }

        await fetchList(nextPage, rowsPerPage);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleChangePage = async (_, nextPage) => {
    setPage(nextPage);
  };

  const handleChangeRowsPerPage = (event) => {
    const nextRowsPerPage = Number(event.target.value);

    setRowsPerPage(nextRowsPerPage);
    setPage(0);
  };

  const startEdit = (item) => {
    setEditingProductId(item._id);
    setEditForm({
      id: item._id,
      name: item.name || "",
      description: item.description || "",
      status: item.status || "active",
      price: item.price ?? "",
      originalPrice: item.originalPrice ?? "",
      stockQuantity: item.stockQuantity ?? 0,
      category: Array.isArray(item.category)
        ? item.category
        : [item.category].filter(Boolean),
      subCategory: item.subCategory || "TopSeller",
      models: Array.isArray(item.models) ? item.models.join(", ") : "",
      tags: Array.isArray(item.tags) ? item.tags.join(", ") : "",
      rating: item.rating ?? "",
      reviewCount: item.reviewCount ?? "",
      bestSeller: Boolean(item.bestSeller),
    });
  };

  const cancelEdit = () => {
    setEditingProductId("");
    setEditForm(EMPTY_FORM);
  };

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleCategory = (categoryOption) => {
    setEditForm((prev) => {
      const hasCategory = prev.category.includes(categoryOption);
      const nextCategories = hasCategory
        ? prev.category.filter((item) => item !== categoryOption)
        : [...prev.category, categoryOption];

      return {
        ...prev,
        category: nextCategories.length ? nextCategories : prev.category,
      };
    });
  };

  const saveProduct = async () => {
    setIsSaving(true);
    try {
      const response = await axios.post(
        backendUrl + "/api/product/update",
        {
          id: editForm.id,
          name: editForm.name,
          description: editForm.description,
          status: editForm.status,
          price: editForm.price,
          originalPrice: editForm.originalPrice,
          stockQuantity: editForm.stockQuantity,
          category: JSON.stringify(editForm.category),
          subCategory: editForm.subCategory,
          models: JSON.stringify(
            editForm.models
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
          ),
          tags: JSON.stringify(
            editForm.tags
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
          ),
          rating: editForm.rating,
          reviewCount: editForm.reviewCount,
          bestSeller: editForm.bestSeller,
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
    const loadList = async () => {
      await fetchList(page, rowsPerPage);
    };

    loadList();
  }, [fetchList, page, rowsPerPage]);

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800}>
          Product List
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.75 }}>
          Review inventory, update product records, and clean up older listings.
        </Typography>
      </Box>

      <TablePagination
        component="div"
        count={totalProducts}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[10, 25, 50]}
      />

      <Card
        elevation={0}
        sx={{
          borderRadius: 4,
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 16px 40px rgba(15, 23, 42, 0.06)",
        }}
      >
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table sx={{ minWidth: 820 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "grey.50" }}>
                  <TableCell>Image</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="right">Stock</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {list.map((item) => (
                  <TableRow hover key={item._id}>
                    <TableCell sx={{ width: 88 }}>
                      <Box
                        component="img"
                        src={item.image?.[0]}
                        alt={item.name}
                        sx={{
                          width: 52,
                          height: 52,
                          objectFit: "cover",
                          borderRadius: 2.5,
                          border: "1px solid",
                          borderColor: "divider",
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography fontWeight={700}>{item.name}</Typography>
                        {item.bestSeller && (
                          <Chip
                            icon={<SellSharpIcon />}
                            label="Best Seller"
                            size="small"
                            color="warning"
                            variant="outlined"
                            sx={{ width: "fit-content" }}
                          />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography color="text.secondary">
                        {Array.isArray(item.category)
                          ? item.category.join(", ")
                          : item.category}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          STATUS_OPTIONS.find(
                            (option) =>
                              option.value === (item.status || "active")
                          )?.label || "Active"
                        }
                        color={
                          STATUS_OPTIONS.find(
                            (option) =>
                              option.value === (item.status || "active")
                          )?.color || "default"
                        }
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {currency}
                      {item.price}
                    </TableCell>
                    <TableCell align="right">{item.stockQuantity}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="Edit">
                        <IconButton
                          onClick={() => startEdit(item)}
                          color="primary"
                        >
                          <EditSharpIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          onClick={() => removeProduct(item._id)}
                          color="error"
                        >
                          <DeleteOutlineSharpIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(editingProductId)}
        onClose={cancelEdit}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" fontWeight={800}>
            Edit Product
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Update pricing, stock, content, and merchandising details.
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.25 }}>
            <Grid item xs={12}>
              <TextField
                label="Product Name"
                value={editForm.name}
                onChange={(e) => handleEditChange("name", e.target.value)}
                fullWidth
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Description"
                value={editForm.description}
                onChange={(e) =>
                  handleEditChange("description", e.target.value)
                }
                fullWidth
                multiline
                minRows={4}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Price"
                type="number"
                value={editForm.price}
                onChange={(e) => handleEditChange("price", e.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">{currency}</InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Original Price"
                type="number"
                value={editForm.originalPrice}
                onChange={(e) =>
                  handleEditChange("originalPrice", e.target.value)
                }
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">{currency}</InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={editForm.status}
                  onChange={(e) => handleEditChange("status", e.target.value)}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Stock Quantity"
                type="number"
                value={editForm.stockQuantity}
                onChange={(e) =>
                  handleEditChange("stockQuantity", e.target.value)
                }
                fullWidth
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Sub Category</InputLabel>
                <Select
                  label="Sub Category"
                  value={editForm.subCategory}
                  onChange={(e) =>
                    handleEditChange("subCategory", e.target.value)
                  }
                >
                  <MenuItem value="TopSeller">Top Seller</MenuItem>
                  <MenuItem value="NewArrival">New Arrival</MenuItem>
                  <MenuItem value="Sale">Sale</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={editForm.bestSeller}
                    onChange={() =>
                      handleEditChange("bestSeller", !editForm.bestSeller)
                    }
                  />
                }
                label="Best Seller"
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                Categories
              </Typography>
              <FormGroup row>
                {CATEGORY_OPTIONS.map((option) => (
                  <FormControlLabel
                    key={option}
                    control={
                      <Checkbox
                        checked={editForm.category.includes(option)}
                        onChange={() => toggleCategory(option)}
                      />
                    }
                    label={option}
                  />
                ))}
              </FormGroup>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Models"
                value={editForm.models}
                onChange={(e) => handleEditChange("models", e.target.value)}
                fullWidth
                placeholder="Comma separated"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Tags"
                value={editForm.tags}
                onChange={(e) => handleEditChange("tags", e.target.value)}
                fullWidth
                placeholder="Comma separated"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Rating"
                type="number"
                value={editForm.rating}
                onChange={(e) => handleEditChange("rating", e.target.value)}
                inputProps={{ min: 0, max: 5, step: 0.1 }}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Review Count"
                type="number"
                value={editForm.reviewCount}
                onChange={(e) =>
                  handleEditChange("reviewCount", e.target.value)
                }
                inputProps={{ min: 0 }}
                fullWidth
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={cancelEdit} color="inherit">
            Cancel
          </Button>
          <Button onClick={saveProduct} variant="contained" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default List;
