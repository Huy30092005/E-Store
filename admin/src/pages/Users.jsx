import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
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
import AddSharpIcon from "@mui/icons-material/AddSharp";
import BlockSharpIcon from "@mui/icons-material/BlockSharp";
import CheckCircleSharpIcon from "@mui/icons-material/CheckCircleSharp";
import DeleteOutlineSharpIcon from "@mui/icons-material/DeleteOutlineSharp";
import EditSharpIcon from "@mui/icons-material/EditSharp";
import LockResetSharpIcon from "@mui/icons-material/LockResetSharp";
import SearchSharpIcon from "@mui/icons-material/SearchSharp";
import { toast } from "react-toastify";
import { backendUrl, currency } from "../config";

const ROLE_OPTIONS = [
  { value: "", label: "All roles" },
  { value: "customer", label: "Customer" },
  { value: "admin", label: "Admin" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "blocked", label: "Blocked" },
];

const USER_FORM_DEFAULT = {
  name: "",
  email: "",
  password: "",
  role: "customer",
  status: "active",
};

const CARD_SX = {
  borderRadius: 2,
  border: "1px solid",
  borderColor: "divider",
  boxShadow: "0 16px 40px rgba(15, 23, 42, 0.06)",
};

const getStatusLabel = (status) =>
  STATUS_OPTIONS.find((option) => option.value === status)?.label || "Active";

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default function Users({ token }) {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userDialog, setUserDialog] = useState({ open: false, mode: "create", user: null });
  const [passwordDialog, setPasswordDialog] = useState({ open: false, user: null, password: "" });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null });
  const [form, setForm] = useState(USER_FORM_DEFAULT);
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const response = await axios.get(backendUrl + "/api/user/admin/users", {
        headers: { token },
        params: {
          page: page + 1,
          limit: rowsPerPage,
          search: search.trim(),
          role: roleFilter,
          status: statusFilter,
        },
      });

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to load users.");
      }

      setUsers(response.data.users || []);
      setTotalUsers(response.data.pagination?.totalUsers || 0);
    } catch (fetchError) {
      const message = fetchError.response?.data?.message || fetchError.message;
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, rowsPerPage, search, statusFilter, token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const resetPagination = () => setPage(0);

  const openCreateDialog = () => {
    setForm(USER_FORM_DEFAULT);
    setUserDialog({ open: true, mode: "create", user: null });
  };

  const openEditDialog = (user) => {
    setForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.role || "customer",
      status: user.status || "active",
    });
    setUserDialog({ open: true, mode: "edit", user });
  };

  const closeUserDialog = () => {
    setUserDialog({ open: false, mode: "create", user: null });
    setForm(USER_FORM_DEFAULT);
  };

  const updateUserField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const saveUser = async () => {
    setSaving(true);

    try {
      const isCreate = userDialog.mode === "create";
      const url = isCreate
        ? backendUrl + "/api/user/admin/users"
        : `${backendUrl}/api/user/admin/users/${userDialog.user._id}`;

      const response = isCreate
        ? await axios.post(url, form, { headers: { token } })
        : await axios.patch(
            url,
            {
              name: form.name,
              email: form.email,
            },
            { headers: { token } }
          );

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to save user.");
      }

      if (!isCreate) {
        await Promise.all([
          updateUserRole(userDialog.user._id, form.role, false),
          updateUserStatus(userDialog.user._id, form.status, false),
        ]);
      }

      toast.success(response.data.message);
      closeUserDialog();
      await fetchUsers();
    } catch (saveError) {
      toast.error(saveError.response?.data?.message || saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const updateUserRole = async (userId, role, showToast = true) => {
    const response = await axios.patch(
      `${backendUrl}/api/user/admin/users/${userId}/role`,
      { role },
      { headers: { token } }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || "Failed to update role.");
    }

    if (showToast) {
      toast.success(response.data.message);
      await fetchUsers();
    }
  };

  const updateUserStatus = async (userId, status, showToast = true) => {
    const response = await axios.patch(
      `${backendUrl}/api/user/admin/users/${userId}/status`,
      { status },
      { headers: { token } }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || "Failed to update status.");
    }

    if (showToast) {
      toast.success(response.data.message);
      await fetchUsers();
    }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      await updateUserRole(userId, role);
    } catch (updateError) {
      toast.error(updateError.response?.data?.message || updateError.message);
    }
  };

  const handleStatusToggle = async (user) => {
    try {
      const nextStatus = user.status === "blocked" ? "active" : "blocked";
      await updateUserStatus(user._id, nextStatus);
    } catch (updateError) {
      toast.error(updateError.response?.data?.message || updateError.message);
    }
  };

  const resetPassword = async () => {
    setSaving(true);

    try {
      const response = await axios.patch(
        `${backendUrl}/api/user/admin/users/${passwordDialog.user._id}/password`,
        { password: passwordDialog.password },
        { headers: { token } }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to reset password.");
      }

      toast.success(response.data.message);
      setPasswordDialog({ open: false, user: null, password: "" });
    } catch (resetError) {
      toast.error(resetError.response?.data?.message || resetError.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async () => {
    setSaving(true);

    try {
      const response = await axios.delete(
        `${backendUrl}/api/user/admin/users/${deleteDialog.user._id}`,
        { headers: { token } }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to delete user.");
      }

      toast.success(response.data.message);
      setDeleteDialog({ open: false, user: null });
      await fetchUsers();
    } catch (deleteError) {
      toast.error(deleteError.response?.data?.message || deleteError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(Number(event.target.value));
    setPage(0);
  };

  return (
    <Box>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", md: "flex-start" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Users
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>
            Customer and admin accounts
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddSharpIcon />}
          onClick={openCreateDialog}
          sx={{ alignSelf: { xs: "stretch", md: "center" }, borderRadius: 1.5, fontWeight: 700 }}
        >
          Add User
        </Button>
      </Stack>

      <Card elevation={0} sx={{ ...CARD_SX, mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: "column", lg: "row" }} spacing={2}>
            <TextField
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                resetPagination();
              }}
              label="Search"
              placeholder="Name or email"
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchSharpIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <OptionSelect
              label="Role"
              value={roleFilter}
              options={ROLE_OPTIONS}
              onChange={(value) => {
                setRoleFilter(value);
                resetPagination();
              }}
            />
            <OptionSelect
              label="Status"
              value={statusFilter}
              options={STATUS_OPTIONS}
              onChange={(value) => {
                setStatusFilter(value);
                resetPagination();
              }}
            />
          </Stack>
        </CardContent>
      </Card>

      {loading && <LinearProgress sx={{ borderRadius: 999, mb: 2 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TablePagination
        component="div"
        count={totalUsers}
        page={page}
        onPageChange={(_, nextPage) => setPage(nextPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleRowsPerPageChange}
        rowsPerPageOptions={[10, 25, 50]}
      />

      <Card elevation={0} sx={CARD_SX}>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table sx={{ minWidth: 980 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "grey.50" }}>
                  {["User", "Role", "Status", "Orders", "Spent", "Joined", "Actions"].map((heading) => (
                    <TableCell
                      key={heading}
                      align={["Orders", "Spent", "Actions"].includes(heading) ? "center" : "left"}
                    >
                      {heading}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <UserRow
                    key={user._id}
                    user={user}
                    onEdit={openEditDialog}
                    onRoleChange={handleRoleChange}
                    onStatusToggle={handleStatusToggle}
                    onPasswordReset={(nextUser) =>
                      setPasswordDialog({ open: true, user: nextUser, password: "" })
                    }
                    onDelete={(nextUser) => setDeleteDialog({ open: true, user: nextUser })}
                  />
                ))}
                {!users.length && !loading && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary">No users found.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <UserDialog
        open={userDialog.open}
        mode={userDialog.mode}
        form={form}
        saving={saving}
        onChange={updateUserField}
        onClose={closeUserDialog}
        onSave={saveUser}
      />

      <PasswordDialog
        dialog={passwordDialog}
        saving={saving}
        onClose={() => setPasswordDialog({ open: false, user: null, password: "" })}
        onChange={(password) => setPasswordDialog((prev) => ({ ...prev, password }))}
        onSave={resetPassword}
      />

      <DeleteDialog
        dialog={deleteDialog}
        saving={saving}
        onClose={() => setDeleteDialog({ open: false, user: null })}
        onConfirm={deleteUser}
      />
    </Box>
  );
}

function UserRow({ user, onEdit, onRoleChange, onStatusToggle, onPasswordReset, onDelete }) {
  const isBlocked = user.status === "blocked";

  return (
    <TableRow hover>
      <TableCell>
        <Stack spacing={0.4}>
          <Typography fontWeight={700}>{user.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {user.email}
          </Typography>
          <Chip
            label={user.provider || "local"}
            size="small"
            variant="outlined"
            sx={{ width: "fit-content", textTransform: "capitalize" }}
          />
        </Stack>
      </TableCell>
      <TableCell sx={{ minWidth: 150 }}>
        <FormControl size="small" fullWidth>
          <InputLabel>Role</InputLabel>
          <Select
            label="Role"
            value={user.role || "customer"}
            onChange={(event) => onRoleChange(user._id, event.target.value)}
          >
            {ROLE_OPTIONS.filter((option) => option.value).map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </TableCell>
      <TableCell>
        <Chip
          label={getStatusLabel(user.status)}
          color={isBlocked ? "error" : "success"}
          variant="outlined"
          size="small"
        />
      </TableCell>
      <TableCell align="center">{user.orderCount || 0}</TableCell>
      <TableCell align="center">
        {currency}
        {Number(user.totalSpent || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </TableCell>
      <TableCell>{formatDate(user.createdAt)}</TableCell>
      <TableCell align="center">
        <Tooltip title="Edit">
          <IconButton onClick={() => onEdit(user)} color="primary">
            <EditSharpIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Reset password">
          <IconButton onClick={() => onPasswordReset(user)} color="primary">
            <LockResetSharpIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title={isBlocked ? "Activate" : "Block"}>
          <IconButton onClick={() => onStatusToggle(user)} color={isBlocked ? "success" : "warning"}>
            {isBlocked ? <CheckCircleSharpIcon /> : <BlockSharpIcon />}
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton onClick={() => onDelete(user)} color="error">
            <DeleteOutlineSharpIcon />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}

function UserDialog({ open, mode, form, saving, onChange, onClose, onSave }) {
  const isCreate = mode === "create";

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" fontWeight={800}>
          {isCreate ? "Add User" : "Edit User"}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <TextField
            label="Name"
            value={form.name}
            onChange={(event) => onChange("name", event.target.value)}
            fullWidth
            required
          />
          <TextField
            label="Email"
            type="email"
            value={form.email}
            onChange={(event) => onChange("email", event.target.value)}
            fullWidth
            required
          />
          {isCreate && (
            <TextField
              label="Password"
              type="password"
              value={form.password}
              onChange={(event) => onChange("password", event.target.value)}
              fullWidth
              required
            />
          )}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <OptionSelect
              label="Role"
              value={form.role}
              options={ROLE_OPTIONS.filter((option) => option.value)}
              onChange={(value) => onChange("role", value)}
            />
            <OptionSelect
              label="Status"
              value={form.status}
              options={STATUS_OPTIONS.filter((option) => option.value)}
              onChange={(value) => onChange("status", value)}
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={onSave} variant="contained" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function PasswordDialog({ dialog, saving, onClose, onChange, onSave }) {
  return (
    <Dialog open={dialog.open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>
        <Typography variant="h6" fontWeight={800}>
          Reset Password
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Typography color="text.secondary">
            {dialog.user?.email}
          </Typography>
          <TextField
            label="New password"
            type="password"
            value={dialog.password}
            onChange={(event) => onChange(event.target.value)}
            fullWidth
            required
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={onSave} variant="contained" disabled={saving}>
          {saving ? "Saving..." : "Reset"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function DeleteDialog({ dialog, saving, onClose, onConfirm }) {
  return (
    <Dialog open={dialog.open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>
        <Typography variant="h6" fontWeight={800}>
          Delete User
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Typography>
          Delete {dialog.user?.email}? Accounts with orders will be blocked instead.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={onConfirm} color="error" variant="contained" disabled={saving}>
          {saving ? "Deleting..." : "Delete"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function OptionSelect({ label, value, options, onChange }) {
  return (
    <FormControl fullWidth sx={{ minWidth: 180 }}>
      <InputLabel>{label}</InputLabel>
      <Select label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
