async function uploadImage() {
  const fileInput = document.getElementById("imageInput");
  const message = document.getElementById("message");
  const metadata = document.getElementById("metadata");
  const preview = document.getElementById("preview");

  if (!fileInput.files.length) {
    message.innerText = "Please select an image first.";
    return;
  }

  const file = fileInput.files[0];

  preview.src = URL.createObjectURL(file);
  preview.style.display = "block";

  const formData = new FormData();
  formData.append("image", file);
  formData.append("description", "Image uploaded through CloudVision frontend");

  message.innerText = "Uploading image to Azure...";

  try {
    const response = await fetch("http://localhost:5001/api/images", {
      method: "POST",
      body: formData
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.details || result.error || "Upload failed");
    }

    message.innerText = "Image uploaded successfully to Azure Blob Storage and Cosmos DB.";
    metadata.innerText = JSON.stringify(result.data, null, 2);
  } catch (error) {
    message.innerText = "Upload failed: " + error.message;
  }
}