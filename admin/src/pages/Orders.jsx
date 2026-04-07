import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import LocalShippingSharpIcon from "@mui/icons-material/LocalShippingSharp";
import Inventory2SharpIcon from "@mui/icons-material/Inventory2Sharp";
import { backendUrl, currency } from "../config";
import { toast } from "react-toastify";

const ORDER_STATUS_OPTIONS = [
  "Order Placed",
  "Packing",
  "Shipped",
  "Out for Delivery",
  "Delivered",
];

const Orders = ({ token }) => {
  const [orders, setOrders] = useState([]);

  const getAddress = (order) => order.shippingAddress || order.address || {};

  const getCustomerName = (address) => {
    if (address.name) return address.name;
    return [address.firstName, address.lastName].filter(Boolean).join(" ").trim();
  };

  const fetchAllOrders = useCallback(async () => {
    if (!token) return null;

    try {
      const response = await axios.post(
        backendUrl + "/api/order/list",
        {},
        { headers: { token } }
      );

      if (response.data.success) {
        setOrders(response.data.orders);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  }, [token]);

  const statusHandler = async (event, orderId) => {
    try {
      const response = await axios.post(
        backendUrl + "/api/order/status",
        { orderId, status: event.target.value },
        { headers: { token } }
      );
      if (response.data.success) {
        await fetchAllOrders();
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    const loadOrders = async () => {
      await fetchAllOrders();
    };

    loadOrders();
  }, [fetchAllOrders]);

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800}>
          Orders
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.75 }}>
          Track fulfillment progress, payment state, and delivery information from one queue.
        </Typography>
      </Box>

      <Stack spacing={2}>
        {orders.map((order) => {
          const address = getAddress(order);

          return (
            <Card
              key={order._id}
              elevation={0}
              sx={{
                borderRadius: 1,
                border: "1px solid",
                borderColor: "divider",
                boxShadow: "0 16px 40px rgba(15, 23, 42, 0.06)",
              }}
            >
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Stack spacing={2.5}>
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    justifyContent="space-between"
                    spacing={2}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar
                        variant="rounded"
                        sx={{ width: 48, height: 48, bgcolor: "primary.main", borderRadius: 1 }}
                      >
                        <LocalShippingSharpIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="h6" fontWeight={800}>
                          {getCustomerName(address) || "Unknown customer"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Placed on {new Date(order.createdAt || order.date).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </Stack>

                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip
                        label={`${currency}${order.totalAmount ?? order.amount}`}
                        color="success"
                        variant="outlined"
                      />
                      <Chip
                        label={order.payment ? "Payment Done" : "Payment Pending"}
                        color={order.payment ? "success" : "warning"}
                        variant="filled"
                      />
                      <Chip label={order.paymentMethod} variant="outlined" />
                    </Stack>
                  </Stack>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", lg: "1.6fr 1fr 280px" },
                      gap: 2,
                    }}
                  >
                    <Card variant="outlined" sx={{ borderRadius: 1 }}>
                      <CardContent>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                          <Inventory2SharpIcon color="primary" fontSize="small" />
                          <Typography fontWeight={700}>Items</Typography>
                        </Stack>
                        <Stack spacing={1}>
                          {order.items.map((item, index) => (
                            <Box
                              key={`${order._id}-${index}`}
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 2,
                                p: 1.25,
                                borderRadius: 1.5,
                                bgcolor: "grey.50",
                              }}
                            >
                              <Typography fontWeight={600}>
                                {item.name || item.product?.name}
                              </Typography>
                              <Typography color="text.secondary">
                                x{item.quantity} {item.size || item.model}
                              </Typography>
                            </Box>
                          ))}
                        </Stack>
                      </CardContent>
                    </Card>

                    <Card variant="outlined" sx={{ borderRadius: 1 }}>
                      <CardContent>
                        <Typography fontWeight={700} sx={{ mb: 1.5 }}>
                          Shipping details
                        </Typography>
                        <Stack spacing={0.75}>
                          <Typography color="text.secondary">
                            {address.street || address.address || "-"}
                          </Typography>
                          <Typography color="text.secondary">
                            {[address.city, address.state, address.zipcode || address.zip, address.country]
                              .filter(Boolean)
                              .join(", ") || "-"}
                          </Typography>
                          <Typography color="text.secondary">
                            {address.phone || address.email || "-"}
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            {order.items.length} line items
                          </Typography>
                        </Stack>
                      </CardContent>
                    </Card>

                    <Card
                      variant="outlined"
                      sx={{
                        borderRadius: 1,
                        background:
                          "linear-gradient(180deg, rgba(248,250,252,1) 0%, rgba(255,255,255,1) 100%)",
                      }}
                    >
                      <CardContent>
                        <Typography fontWeight={700} sx={{ mb: 1.5 }}>
                          Fulfillment
                        </Typography>
                        <FormControl fullWidth size="small">
                          <InputLabel>Status</InputLabel>
                          <Select
                            label="Status"
                            value={order.status}
                            onChange={(event) => statusHandler(event, order._id)}
                          >
                            {ORDER_STATUS_OPTIONS.map((option) => (
                              <MenuItem key={option} value={option}>
                                {option}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </CardContent>
                    </Card>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Stack>
    </Box>
  );
};

export default Orders;
