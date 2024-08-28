import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  CircularProgress,
} from "@mui/material";
import { db } from "../firebase"; // Ensure correct path
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";

const FullPageTable = () => {
  const [orders, setOrders] = useState([]);
  const [prices, setPrices] = useState({});
  const [quantities, setQuantities] = useState({});
  const [selectedOrder, setSelectedOrder] = useState("");
  const [quantity, setQuantity] = useState("");
  const [amount, setAmount] = useState(0);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false); // Loading state

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); // Start loading
      try {
        console.log("Fetching recipes...");

        // Fetch recipes
        const recipeSnapshot = await getDocs(collection(db, "recipes"));
        const recipeDocs = recipeSnapshot.docs;
        const recipeNames = recipeDocs.map((doc) => doc.id);
        console.log("Fetched recipe names:", recipeNames);

        // Fetch prices and set initial quantities
        const priceMap = {};
        const quantityMap = {};
        for (const recipeDoc of recipeDocs) {
          const recipeName = recipeDoc.id;

          // Fetch price
          const priceDocRef = doc(db, "price", recipeName);
          const priceDoc = await getDoc(priceDocRef);
          if (priceDoc.exists()) {
            priceMap[recipeName] = priceDoc.data().price;
          } else {
            console.warn(`Price not found for: ${recipeName}`);
          }

          // Fetch or set initial quantity
          const quantityDocRef = doc(db, "quantity", recipeName);
          const quantityDoc = await getDoc(quantityDocRef);
          if (quantityDoc.exists()) {
            quantityMap[recipeName] = quantityDoc.data().quantity;
          } else {
            // Set initial quantity to 7 if it doesn't exist
            await setDoc(quantityDocRef, { quantity: 7 });
            quantityMap[recipeName] = 7;
          }
        }

        console.log("Fetched price data:", priceMap);
        console.log("Fetched or initialized quantity data:", quantityMap);

        // Set orders, prices, and quantities
        setOrders(recipeNames);
        setPrices(priceMap);
        setQuantities(quantityMap);
        if (recipeNames.length > 0) {
          setSelectedOrder(recipeNames[0]); // Set default selection
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false); // End loading
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (selectedOrder && prices[selectedOrder]) {
      setAmount(prices[selectedOrder]); // Update amount based on selected order
    }
  }, [selectedOrder, prices]);

  useEffect(() => {
    const calculatedTotal = rows.reduce(
      (acc, row) => acc + row.quantity * row.amount,
      0
    );
    setTotal(calculatedTotal);
  }, [rows]);

  const handleAddOrder = async () => {
    if (selectedOrder && quantity > 0) {
      const currentQuantity = quantities[selectedOrder] || 0;
      const orderQuantity = parseInt(quantity, 10);
      if (orderQuantity > currentQuantity) {
        alert(
          `Not enough stock for ${selectedOrder}. Available: ${currentQuantity}`
        );
        return;
      }

      const newRow = {
        name: selectedOrder,
        quantity: orderQuantity,
        amount: amount,
      };

      // Update quantity in database
      const newQuantity = currentQuantity - orderQuantity;
      const quantityDocRef = doc(db, "quantity", selectedOrder);
      await updateDoc(quantityDocRef, { quantity: newQuantity });

      // Update state
      setRows([...rows, newRow]);
      setQuantities({
        ...quantities,
        [selectedOrder]: newQuantity,
      });
      setQuantity("");
    } else {
      alert("Please select an order and enter a valid quantity.");
    }
  };

  const handlePay = async () => {
    console.log("Processing payment for total:", total);

    try {
      // Save the billing data to Firebase
      const billRef = doc(collection(db, "bills")); // Create a new document in the "bills" collection
      const billData = {
        orders: rows,
        total: total,
        timestamp: new Date(),
      };

      // Save billing data
      await setDoc(billRef, billData);
      console.log("Billing data saved successfully");

      // Update quantities in the database
      const quantityUpdates = rows.map(async (row) => {
        const quantityDocRef = doc(db, "quantity", row.name);
        const currentQuantityDoc = await getDoc(quantityDocRef);
        if (currentQuantityDoc.exists()) {
          const currentQuantity = currentQuantityDoc.data().quantity;
          const newQuantity = currentQuantity - row.quantity;
          await updateDoc(quantityDocRef, { quantity: newQuantity });
        }
      });

      // Wait for all quantity updates to complete
      await Promise.all(quantityUpdates);

      // Optionally, clear the orders and reset state
      setRows([]);
      setTotal(0);
      setQuantity("");
      setSelectedOrder("");

      // Trigger re-fetch of quantities in the ItemPage component
      window.dispatchEvent(new Event("refreshItems"));

      alert("Payment processed successfully");
    } catch (error) {
      console.error("Error saving billing data:", error);
      alert("Error processing payment. Please try again.");
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "start",
        alignItems: "center",
        height: "70vh",
        width: "100vw",
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: "1100px",
          bgcolor: "#Faebd7",
          padding: "2rem",
          display: "flex",
          flexDirection: "column",
          height: "70vh",
        }}
      >
        <Typography variant="h4" sx={{ color: "#FFA726", mb: 2 }}>
          Billing
        </Typography>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="order-select-label">Select Order</InputLabel>
          <Select
            labelId="order-select-label"
            value={selectedOrder}
            onChange={(e) => setSelectedOrder(e.target.value)}
            fullWidth
          >
            {orders.map((orderName) => (
              <MenuItem key={orderName} value={orderName}>
                {orderName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          type="number"
          label="Quantity"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
        />
        <Button
          variant="contained"
          sx={{ mb: 2, bgcolor: "#FFA726" }}
          onClick={handleAddOrder}
        >
          Add Order
        </Button>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ flexGrow: 1, overflow: "auto" }}>
            <TableContainer component={Paper} sx={{ flexGrow: 1 }}>
              <Table sx={{ minWidth: 650 }} aria-label="simple table">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell component="th" scope="row">
                        {row.name}
                      </TableCell>
                      <TableCell>{row.quantity}</TableCell>
                      <TableCell>${row.amount.toFixed(2)}</TableCell>
                      <TableCell>
                        ${(row.amount * row.quantity).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mt: 2,
          }}
        >
          <Typography variant="h6" sx={{ mr: 2 }}>
            Total: ${total.toFixed(2)}
          </Typography>
          <Button
            variant="contained"
            sx={{ bgcolor: "#FFA726" }}
            onClick={handlePay}
          >
            Pay Now
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default FullPageTable;
