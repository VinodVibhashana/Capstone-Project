// src/ItemPage.jsx
import React, { useState, useEffect } from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
} from "@mui/material";
import Sidebar from "./Sidebar"; // Import Sidebar
import { db } from "../firebase"; // Ensure correct path
import { collection, getDocs } from "firebase/firestore";

const ItemPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchItems = async () => {
    try {
      setLoading(true);

      // Fetch all documents from the "quantity" collection
      const itemsSnapshot = await getDocs(collection(db, "quantity"));
      const itemList = itemsSnapshot.docs.map(doc => ({
        id: doc.id, // Document ID will be used as item name
        quantity: doc.data().quantity // Assuming the field name in Firestore is "quantity"
      }));

      if (itemList.length === 0) {
        setError("No items found.");
      }

      setItems(itemList);
    } catch (error) {
      console.error("Error fetching items:", error);
      setError("Error fetching items.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();

    // Add event listener for custom event
    const handleRefresh = () => {
      fetchItems();
    };

    window.addEventListener("refreshItems", handleRefresh);

    // Clean up event listener on component unmount
    return () => {
      window.removeEventListener("refreshItems", handleRefresh);
    };
  }, []);

  return (
    <Box sx={{ display: "flex" }}>
      <Sidebar /> {/* Add Sidebar */}
      <Box sx={{ flexGrow: 1, padding: "2rem", overflow: "auto" }}>
        <Typography variant="h4" sx={{ color: "#FFA726", mb: 2 }}>
          Item List
        </Typography>
        {loading ? (
          <Typography variant="h6">Loading...</Typography>
        ) : error ? (
          <Typography variant="h6" color="error">{error}</Typography>
        ) : (
          <TableContainer component={Paper} sx={{ maxHeight: "70vh" }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: "1.1rem" }}>Item Name</TableCell>
                  <TableCell sx={{ fontSize: "1.1rem" }}>Quantity</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.length > 0 ? (
                  items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.id}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2}>No items found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Box>
  );
};

export default ItemPage;
