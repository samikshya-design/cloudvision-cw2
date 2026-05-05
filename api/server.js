require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { BlobServiceClient } = require("@azure/storage-blob");
const { CosmosClient } = require("@azure/cosmos");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING
);

const containerClient = blobServiceClient.getContainerClient(
  process.env.AZURE_STORAGE_CONTAINER_NAME
);

const cosmosClient = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT,
  key: process.env.COSMOS_KEY
});

const database = cosmosClient.database(process.env.COSMOS_DATABASE);
const container = database.container(process.env.COSMOS_CONTAINER);

app.get("/", (req, res) => {
  res.send("CloudVision API is running");
});

app.post("/api/images", upload.single("image"), async (req, res) => {
  try {
    const file = req.file;
    const description = req.body.description || "Uploaded from CloudVision";

    if (!file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    const blobName = `${Date.now()}-${file.originalname}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(file.buffer, {
      blobHTTPHeaders: {
        blobContentType: file.mimetype
      }
    });

    const metadata = {
      id: `img-${Date.now()}`,
      userId: "B00974998",
      fileName: file.originalname,
      blobName: blobName,
      imageUrl: blockBlobClient.url,
      tags: ["image", "cloud", "ai-generated"],
      moderationStatus: "Approved",
      description: description,
      uploadDate: new Date().toISOString()
    };

    await container.items.create(metadata);

    res.status(201).json({
      message: "Image uploaded to Azure Blob Storage and metadata saved to Cosmos DB",
      data: metadata
    });
  } catch (error) {
    console.error("Upload error:", error.message);
    res.status(500).json({
      error: "Upload failed",
      details: error.message
    });
  }
});

app.get("/api/images", async (req, res) => {
  try {
    const querySpec = {
      query: "SELECT * FROM c ORDER BY c.uploadDate DESC"
    };

    const { resources } = await container.items.query(querySpec).fetchAll();
    res.json(resources);
  } catch (error) {
    console.error("Fetch error:", error.message);
    res.status(500).json({
      error: "Failed to fetch images",
      details: error.message
    });
  }
});

app.delete("/api/images/:id/:userId", async (req, res) => {
  try {
    const { id, userId } = req.params;

    await container.item(id, userId).delete();

    res.json({
      message: "Image metadata deleted from Cosmos DB",
      id: id
    });
  } catch (error) {
    console.error("Delete error:", error.message);
    res.status(500).json({
      error: "Delete failed",
      details: error.message
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`CloudVision API running on http://localhost:${PORT}`);
});