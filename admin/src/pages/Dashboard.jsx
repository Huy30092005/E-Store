import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Alert,
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import PeopleAltSharpIcon from "@mui/icons-material/PeopleAltSharp";
import Inventory2SharpIcon from "@mui/icons-material/Inventory2Sharp";
import ShoppingCartSharpIcon from "@mui/icons-material/ShoppingCartSharp";
import PaidSharpIcon from "@mui/icons-material/PaidSharp";
import TrendingUpSharpIcon from "@mui/icons-material/TrendingUpSharp";
import WarningAmberSharpIcon from "@mui/icons-material/WarningAmberSharp";
import StarSharpIcon from "@mui/icons-material/StarSharp";
import { BarChart, LineChart, PieChart } from "@mui/x-charts";
import { backendUrl, currency } from "../config";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const STATUS_COLORS = {
  "Order Placed": "#0891B2",
  Packing: "#06B6D4",
  Shipped: "#F97316",
  "Out for Delivery": "#22D3EE",
  Delivered: "#0E7490",
};

const fetchAllProducts = async () => {
  const firstResponse = await axios.get(backendUrl + "/api/product/list", {
    params: { page: 1, limit: 100 },
  });

  if (!firstResponse.data.success) {
    return firstResponse;
  }

  const totalPages = firstResponse.data.pagination?.totalPages || 1;

  if (totalPages <= 1) {
    return firstResponse;
  }

  const remainingResponses = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      axios.get(backendUrl + "/api/product/list", {
        params: { page: index + 2, limit: 100 },
      })
    )
  );

  const failedResponse = remainingResponses.find((response) => !response.data.success);

  if (failedResponse) {
    return failedResponse;
  }

  const allProducts = [
    ...(firstResponse.data.products || []),
    ...remainingResponses.flatMap((response) => response.data.products || []),
  ];

  return {
    ...firstResponse,
    data: {
      ...firstResponse.data,
      products: allProducts,
    },
  };
};

const Dashboard = ({ token }) => {
  const [dashboardData, setDashboardData] = useState({
    products: [],
    orders: [],
    users: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboardData = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const [productsResponse, ordersResponse, usersResponse] = await Promise.all([
        fetchAllProducts(),
        axios.post(backendUrl + "/api/order/list", {}, { headers: { token } }),
        axios.get(backendUrl + "/api/user/list", { headers: { token } }),
      ]);

      const nextError =
        (!productsResponse.data.success && productsResponse.data.message) ||
        (!ordersResponse.data.success && ordersResponse.data.message) ||
        (!usersResponse.data.success && usersResponse.data.message);

      if (nextError) {
        throw new Error(nextError);
      }

      setDashboardData({
        products: productsResponse.data.products || [],
        orders: ordersResponse.data.orders || [],
        users: usersResponse.data.users || [],
      });
    } catch (fetchError) {
      setError(fetchError.response?.data?.message || fetchError.message || "Failed to load dashboard analytics.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const analytics = useMemo(() => {
    const { products, orders, users } = dashboardData;
    const now = new Date();
    const monthSeries = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: `${MONTH_LABELS[date.getMonth()]} ${String(date.getFullYear()).slice(-2)}`,
        revenue: 0,
        orders: 0,
        newUsers: 0,
      };
    });

    const ordersByStatus = new Map();
    const categoryMap = new Map();
    const productSalesMap = new Map();
    const userOrderMap = new Map();

    let totalRevenue = 0;
    let totalUnitsSold = 0;
    let paidOrders = 0;

    products.forEach((product) => {
      const categories = Array.isArray(product.category) ? product.category : [product.category].filter(Boolean);

      categories.forEach((category) => {
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
      });
    });

    orders.forEach((order) => {
      const orderAmount = Number(order.totalAmount ?? order.amount ?? 0);
      const orderDate = new Date(order.createdAt || order.date || Date.now());
      const orderMonthKey = `${orderDate.getFullYear()}-${orderDate.getMonth()}`;
      const status = order.status || "Order Placed";
      const itemCount = (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);

      totalRevenue += orderAmount;
      totalUnitsSold += itemCount;
      if (order.payment) {
        paidOrders += 1;
      }

      ordersByStatus.set(status, (ordersByStatus.get(status) || 0) + 1);
      userOrderMap.set(order.userId, (userOrderMap.get(order.userId) || 0) + orderAmount);

      const monthItem = monthSeries.find((item) => item.key === orderMonthKey);
      if (monthItem) {
        monthItem.revenue += orderAmount;
        monthItem.orders += 1;
      }

      (order.items || []).forEach((item) => {
        const productName = item.name || item.product?.name || "Unnamed product";
        productSalesMap.set(productName, (productSalesMap.get(productName) || 0) + Number(item.quantity || 0));
      });
    });

    users.forEach((user) => {
      const userDate = new Date(user.createdAt || Date.now());
      const userMonthKey = `${userDate.getFullYear()}-${userDate.getMonth()}`;
      const monthItem = monthSeries.find((item) => item.key === userMonthKey);

      if (monthItem) {
        monthItem.newUsers += 1;
      }
    });

    const lowStockProducts = [...products]
      .filter((product) => Number(product.stockQuantity || 0) <= 10)
      .sort((a, b) => Number(a.stockQuantity || 0) - Number(b.stockQuantity || 0))
      .slice(0, 5);

    const topProducts = [...productSalesMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, value]) => ({ label, value }));

    const topCustomers = [...users]
      .map((user) => ({
        ...user,
        spent: userOrderMap.get(user._id) || userOrderMap.get(user.id) || 0,
      }))
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 5);

    const activeProducts = products.filter((product) => product.status === "active").length;
    const inventoryValue = products.reduce(
      (sum, product) => sum + Number(product.price || 0) * Number(product.stockQuantity || 0),
      0
    );

    const averageOrderValue = orders.length ? totalRevenue / orders.length : 0;
    const conversionProxy = users.length ? (orders.length / users.length) * 100 : 0;
    const fulfillmentRate = orders.length ? (paidOrders / orders.length) * 100 : 0;

    return {
      totalUsers: users.length,
      totalProducts: products.length,
      totalOrders: orders.length,
      totalRevenue,
      averageOrderValue,
      totalUnitsSold,
      activeProducts,
      inventoryValue,
      conversionProxy,
      fulfillmentRate,
      monthSeries,
      lowStockProducts,
      topProducts,
      topCustomers,
      categoryData: [...categoryMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([label, value]) => ({ label, value })),
      orderStatusData: [...ordersByStatus.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([label, value], index) => ({
          id: index,
          value,
          label,
          color: STATUS_COLORS[label] || "#64748B",
        })),
      bestRatedProducts: [...products]
        .filter((product) => Number(product.rating || 0) > 0)
        .sort((a, b) => {
          if (Number(b.rating || 0) !== Number(a.rating || 0)) {
            return Number(b.rating || 0) - Number(a.rating || 0);
          }

          return Number(b.reviewCount || 0) - Number(a.reviewCount || 0);
        })
        .slice(0, 4),
    };
  }, [dashboardData]);

  const statCards = [
    {
      title: "Users",
      value: analytics.totalUsers.toLocaleString(),
      helper: `${analytics.monthSeries.at(-1)?.newUsers || 0} new this month`,
      icon: <PeopleAltSharpIcon />,
      gradient: "linear-gradient(135deg, #0891B2 0%, #06B6D4 100%)",
    },
    {
      title: "Products",
      value: analytics.totalProducts.toLocaleString(),
      helper: `${analytics.activeProducts} active listings`,
      icon: <Inventory2SharpIcon />,
      gradient: "linear-gradient(135deg, #0E7490 0%, #67E8F9 100%)",
    },
    {
      title: "Orders",
      value: analytics.totalOrders.toLocaleString(),
      helper: `${analytics.totalUnitsSold.toLocaleString()} units sold`,
      icon: <ShoppingCartSharpIcon />,
      gradient: "linear-gradient(135deg, #C2410C 0%, #F97316 100%)",
    },
    {
      title: "Revenue",
      value: `${currency}${analytics.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      helper: `Avg. order ${currency}${analytics.averageOrderValue.toFixed(0)}`,
      icon: <PaidSharpIcon />,
      gradient: "linear-gradient(135deg, #0E7490 0%, #22D3EE 100%)",
    },
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box
        sx={{
          borderRadius: 2,
          px: { xs: 2.5, md: 4 },
          py: { xs: 3, md: 4 },
          color: "common.white",
          background:
            "radial-gradient(circle at top left, rgba(34,211,238,0.32), transparent 35%), linear-gradient(135deg, #0F172A 0%, #164E63 45%, #0891B2 100%)",
          boxShadow: "0 24px 60px rgba(8, 145, 178, 0.22)",
        }}
      >
        <Stack
          direction={{ xs: "column", lg: "row" }}
          justifyContent="space-between"
          spacing={3}
          useFlexGap
        >
          <Box>
            <Chip
              label="Commerce command center"
              sx={{
                mb: 2,
                color: "common.white",
                bgcolor: "rgba(255,255,255,0.14)",
                backdropFilter: "blur(10px)",
              }}
            />
            <Typography variant="h4" fontWeight={800}>
              Dashboard
            </Typography>
            <Typography sx={{ mt: 1.25, maxWidth: 680, color: "rgba(255,255,255,0.8)" }}>
              Monitor user growth, product health, and order performance from one place with live analytics built on your current admin data.
            </Typography>
          </Box>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            useFlexGap
            sx={{ alignSelf: { lg: "flex-end" } }}
          >
            <MetricPill
              label="Fulfillment"
              value={`${analytics.fulfillmentRate.toFixed(1)}%`}
              icon={<TrendingUpSharpIcon fontSize="small" />}
            />
            <MetricPill
              label="Inventory Value"
              value={`${currency}${analytics.inventoryValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              icon={<Inventory2SharpIcon fontSize="small" />}
            />
            <MetricPill
              label="Order/User"
              value={`${analytics.conversionProxy.toFixed(1)}%`}
              icon={<PeopleAltSharpIcon fontSize="small" />}
            />
          </Stack>
        </Stack>
      </Box>

      {loading && <LinearProgress sx={{ borderRadius: 999 }} />}
      {error && <Alert severity="error">{error}</Alert>}

      <Grid container spacing={2.5}>
        {statCards.map((card) => (
          <Grid key={card.title} size={{ xs: 12, sm: 6, xl: 3 }}>
            <Card sx={{ borderRadius: 2, height: "100%", boxShadow: "0 16px 40px rgba(15, 23, 42, 0.08)" }}>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography color="text.secondary" fontWeight={600}>
                      {card.title}
                    </Typography>
                    <Typography variant="h4" fontWeight={800} sx={{ mt: 1 }}>
                      {card.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                      {card.helper}
                    </Typography>
                  </Box>
                  <Avatar
                    variant="rounded"
                    sx={{
                      width: 56,
                      height: 56,
                      color: "common.white",
                      background: card.gradient,
                    }}
                  >
                    {card.icon}
                  </Avatar>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}

        <Grid size={{ xs: 12, xl: 8 }}>
          <ChartCard
            title="Revenue, orders, and new users"
            subtitle="Last 6 months"
            contentSx={{ overflowX: "auto" }}
          >
            <Box sx={{ minWidth: 700 }}>
              <LineChart
                height={340}
                xAxis={[
                  {
                    scaleType: "point",
                    data: analytics.monthSeries.map((item) => item.label),
                  },
                ]}
                series={[
                  {
                    id: "revenue",
                    label: "Revenue",
                    data: analytics.monthSeries.map((item) => item.revenue),
                    color: "#0891B2",
                    curve: "monotoneX",
                  },
                  {
                    id: "orders",
                    label: "Orders",
                    data: analytics.monthSeries.map((item) => item.orders),
                    color: "#F97316",
                    curve: "monotoneX",
                  },
                  {
                    id: "users",
                    label: "New users",
                    data: analytics.monthSeries.map((item) => item.newUsers),
                    color: "#06B6D4",
                    curve: "monotoneX",
                  },
                ]}
                margin={{ left: 50, right: 20, top: 20, bottom: 30 }}
                grid={{ horizontal: true }}
              />
            </Box>
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6, xl: 4 }}>
          <ChartCard title="Order status" subtitle="Live distribution">
            {analytics.orderStatusData.length ? (
              <PieChart
                height={340}
                series={[
                  {
                    data: analytics.orderStatusData,
                    innerRadius: 55,
                    outerRadius: 120,
                    paddingAngle: 2,
                    cornerRadius: 6,
                  },
                ]}
                slotProps={{ legend: { direction: "column", position: { vertical: "middle", horizontal: "right" } } }}
              />
            ) : (
              <EmptyState text="Orders will appear here once your store starts receiving them." />
            )}
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6, xl: 5 }}>
          <ChartCard title="Product categories" subtitle="Catalog mix by category" contentSx={{ overflowX: "auto" }}>
            {analytics.categoryData.length ? (
              <Box sx={{ minWidth: 520 }}>
                <BarChart
                  height={340}
                  xAxis={[
                    {
                      scaleType: "band",
                      data: analytics.categoryData.map((item) => item.label),
                    },
                  ]}
                  series={[
                    {
                      label: "Products",
                      data: analytics.categoryData.map((item) => item.value),
                      color: "#0891B2",
                    },
                  ]}
                  margin={{ left: 40, right: 20, top: 20, bottom: 40 }}
                  borderRadius={8}
                />
              </Box>
            ) : (
              <EmptyState text="Add products to see how your catalog is distributed." />
            )}
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6, xl: 7 }}>
          <ChartCard title="Top selling products" subtitle="By units sold" contentSx={{ overflowX: "auto" }}>
            {analytics.topProducts.length ? (
              <Box sx={{ minWidth: 560 }}>
                <BarChart
                  layout="horizontal"
                  height={340}
                  yAxis={[
                    {
                      scaleType: "band",
                      data: analytics.topProducts.map((item) => item.label),
                    },
                  ]}
                  xAxis={[{ data: analytics.topProducts.map((item) => item.value) }]}
                  series={[
                    {
                      label: "Units sold",
                      data: analytics.topProducts.map((item) => item.value),
                      color: "#F97316",
                    },
                  ]}
                  margin={{ left: 130, right: 20, top: 20, bottom: 30 }}
                  borderRadius={8}
                />
              </Box>
            ) : (
              <EmptyState text="Sales analytics will populate after the first orders come in." />
            )}
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6, xl: 4 }}>
          <ChartCard title="Top customers" subtitle="Sorted by lifetime spend">
            <Stack spacing={1.5}>
              {analytics.topCustomers.length ? (
                analytics.topCustomers.map((user) => (
                  <Box
                    key={user._id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 2,
                      p: 1.5,
                      borderRadius: 1,
                      bgcolor: "grey.50",
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography fontWeight={700} noWrap>
                        {user.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {user.email}
                      </Typography>
                    </Box>
                    <Chip
                      label={`${currency}${user.spent.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                      sx={{ fontWeight: 700, bgcolor: "rgba(6,182,212,0.12)", color: "#0891B2" }}
                    />
                  </Box>
                ))
              ) : (
                <EmptyState text="Customer spend rankings will appear after orders are placed." />
              )}
            </Stack>
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6, xl: 4 }}>
          <ChartCard title="Inventory alerts" subtitle="Products with low remaining stock">
            <Stack spacing={1.5}>
              {analytics.lowStockProducts.length ? (
                analytics.lowStockProducts.map((product) => (
                  <Box key={product._id} sx={{ p: 1.5, borderRadius: 1, bgcolor: "rgba(249,115,22,0.08)" }}>
                    <Stack direction="row" justifyContent="space-between" spacing={2}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography fontWeight={700} noWrap>
                          {product.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {Array.isArray(product.category) ? product.category.join(", ") : product.category}
                        </Typography>
                      </Box>
                      <Chip
                        icon={<WarningAmberSharpIcon />}
                        label={`${product.stockQuantity} left`}
                        sx={{ bgcolor: "rgba(249,115,22,0.14)", color: "#C2410C", fontWeight: 700 }}
                      />
                    </Stack>
                  </Box>
                ))
              ) : (
                <EmptyState text="No low-stock products right now. Inventory levels look healthy." />
              )}
            </Stack>
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, xl: 4 }}>
          <ChartCard title="Best rated products" subtitle="Highest rating and review confidence">
            <Stack spacing={1.5}>
              {analytics.bestRatedProducts.length ? (
                analytics.bestRatedProducts.map((product) => (
                  <Box key={product._id} sx={{ p: 1.5, borderRadius: 1, bgcolor: "grey.50" }}>
                    <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="center">
                      <Box sx={{ minWidth: 0 }}>
                        <Typography fontWeight={700} noWrap>
                          {product.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {product.reviewCount || 0} reviews
                        </Typography>
                      </Box>
                      <Chip
                        icon={<StarSharpIcon />}
                        label={Number(product.rating || 0).toFixed(1)}
                        sx={{ bgcolor: "rgba(6,182,212,0.12)", color: "#0891B2", fontWeight: 700 }}
                      />
                    </Stack>
                  </Box>
                ))
              ) : (
                <EmptyState text="Ratings-based insights will show once reviews are available." />
              )}
            </Stack>
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  );
};

const MetricPill = ({ label, value, icon }) => {
  return (
    <Box
      sx={{
        minWidth: { xs: "100%", sm: 170 },
        borderRadius: 1,
        px: 2,
        py: 1.5,
        bgcolor: "rgba(255,255,255,0.1)",
        backdropFilter: "blur(12px)",
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ color: "rgba(255,255,255,0.78)" }}>
        {icon}
        <Typography variant="body2" fontWeight={600}>
          {label}
        </Typography>
      </Stack>
      <Typography variant="h6" fontWeight={800} sx={{ mt: 0.5 }}>
        {value}
      </Typography>
    </Box>
  );
};

const ChartCard = ({ title, subtitle, children, contentSx }) => {
  return (
    <Card sx={{ borderRadius: 2, height: "100%", boxShadow: "0 16px 40px rgba(15, 23, 42, 0.08)" }}>
      <CardContent sx={{ p: 3, height: "100%" }}>
        <Typography variant="h6" fontWeight={800}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
          {subtitle}
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Box sx={contentSx}>{children}</Box>
      </CardContent>
    </Card>
  );
};

const EmptyState = ({ text }) => {
  return (
    <Box
      sx={{
        minHeight: 240,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 3,
        textAlign: "center",
        color: "text.secondary",
      }}
    >
      <Typography>{text}</Typography>
    </Box>
  );
};

export default Dashboard;
