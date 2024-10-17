"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { storage, database } from "@/firebaseConfig";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { addDoc, collection, doc, onSnapshot, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AppleIcon,
  CheckIcon,
  Loader2Icon,
  TreePineIcon,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  FolderIcon,
  X,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import Image from "next/image";
import { format } from "date-fns";
import { Dialog, DialogContent } from "@/components/ui/dialog";

// Custom Collapsible component
const Collapsible = ({ triggerText, children }: { triggerText: string; children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 bg-gray-200 rounded-md hover:bg-gray-300 transition"
      >
        {isOpen ? `Hide ${triggerText}` : `View ${triggerText}`}
      </button>
      {isOpen && <div className="mt-2">{children}</div>}
    </div>
  );
};

interface ArrayData {
  id: string;
  fileName: string;
  downloadURL: string;
  fileType: string;
  positionId?: string;
  isFolder?: boolean;
  folderName?: string;
  createdAt?: string;
  fileSize?: number;
  predictions?: {
    detections: Detection[];
    tree_detections: Detection[];
  };
}

interface Detection {
  class: string;
  confidence: number;
  bbox: number[];
  box: number[];
}

interface ProcessedImage {
  id: string;
  file: File;
  image: string;
  output: {
    detections: Detection[];
    tree_detections: Detection[];
    appleDetections: { [key: string]: number };
  } | null;
  processedImage: string | null;
  isProcessing: boolean;
  error: string | null;
  aiRequestId?: string;
}

export default function Component() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedImages, setSelectedImages] = useState<ArrayData[]>([]);
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const { userId } = useAuth();
  const [uploadedItems, setUploadedItems] = useState<ArrayData[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState("root");
  const [folderPath, setFolderPath] = useState<{ id: string; name: string }[]>([
    { id: "root", name: "Root" },
  ]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  const steps = [
    { title: "Choose images", description: "Select uploaded crop files" },
    { title: "Process files", description: "Start processing files" },
    { title: "Processing complete", description: "Processing finished" },
    { title: "View results", description: "Review results" },
  ];

  const detectionFolderId = process.env.NEXT_PUBLIC_FOLDER_ID as string;

  const fetchItems = useCallback(
    async (folderId: string) => {
      if (userId) {
        console.log("Fetching items for folder:", folderId);
        const filesCollection = collection(database, "files");
        const q = query(
          filesCollection,
          where("userId", "==", userId),
          where("positionId", "==", folderId)
        );

        const querySnapshot = await getDocs(q);
        const items = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ArrayData[];

        console.log("Fetched items:", items);
        setUploadedItems(items);
        setIsLoading(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    setIsLoading(true);
    fetchItems(currentFolderId);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);
  }, [fetchItems, currentFolderId]);

  const handleImageSelect = (image: ArrayData) => {
    console.log("Image selected:", image);
    setSelectedImages((prev) => {
      if (prev.some((img) => img.id === image.id)) {
        return prev.filter((img) => img.id !== image.id);
      } else {
        return [...prev, image];
      }
    });
  };

  const handleSelectAll = () => {
    console.log("Selecting all images");
    const allImages = uploadedItems.filter((item) => !item.isFolder);
    if (selectedImages.length === allImages.length) {
      setSelectedImages([]);
    } else {
      setSelectedImages(allImages);
    }
  };

  const uploadOriginalImage = async (
    originalBlob: Blob,
    fileName: string,
    predictions: {
      detections: Detection[];
      tree_detections: Detection[];
    },
    sessionId: string
  ) => {
    if (!detectionFolderId || !userId) {
      console.error("Detection Folder ID or User ID is not available");
      return;
    }

    try {
      console.log("Checking if image already exists:", fileName);
      const filesCollection = collection(database, "files");
      const q = query(
        filesCollection,
        where("fileName", "==", fileName),
        where("positionId", "==", detectionFolderId),
        where("userId", "==", userId)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        console.log("Image already exists, skipping upload");
        return;
      }
      console.log("Uploading original image:", fileName);
      const storageRef = ref(storage, `${detectionFolderId}/${fileName}`);
      const uploadTask = uploadBytesResumable(storageRef, originalBlob);

      return new Promise<void>((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress =
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log(`Upload progress: ${progress}%`);
          },
          (error) => {
            console.error("Upload failed:", error);
            reject(error);
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            const fileSize = originalBlob.size;
            const createdAt = new Date().toISOString();

            console.log("Saving file metadata to Firestore");
            await addDoc(collection(database, "files"), {
              fileName: fileName,
              downloadURL,
              userId: userId,
              positionId: detectionFolderId,
              fileType: "image/jpeg",
              isFolder: false,
              fileSize,
              createdAt,
              predictions: predictions,
              sessionId: sessionId,
              processedAt: new Date().toISOString(),
              blockId: currentFolderId, // Add the current folder ID here
            });

            console.log("File metadata saved successfully", predictions);
            resolve();
          }
        );
      });
    } catch (error) {
      console.error("Error uploading original image:", error);
    }
  };

  const processImages = async (images: ArrayData[]) => {
    const aiRequestsCollection = collection(database, "aiRequests");
    const aiRequestIds = [];

    // Loop through selected images to set up listeners for AI request results
    for (const image of images) {
      try {
        // Add each image's AI request document to Firestore
        const aiRequestDoc = await addDoc(aiRequestsCollection, {
          fileName: image.fileName,
          downloadURL: image.downloadURL,
          tokenId: image.id,
          userId: userId,
          status: "pending",
          createdAt: new Date().toISOString(),
          blockId: currentFolderId, // Add the current folder ID here
        });
        aiRequestIds.push(aiRequestDoc.id);

        // Update state to mark image as processing
        setProcessedImages((prev) =>
          prev.map((img) =>
            img.id === image.id
              ? { ...img, isProcessing: true, aiRequestId: aiRequestDoc.id }
              : img
          )
        );
      } catch (error) {
        console.error(`Error creating AI request for ${image.fileName}:`, error);
      }
    }

    // Firestore listener to handle AI results when the AI function updates the document
    const unsubscribeFunctions = aiRequestIds.map((id) => {
      const aiRequestDocRef = doc(database, "aiRequests", id);

      return onSnapshot(aiRequestDocRef, async (doc) => {
        if (doc.exists()) {
          const updatedRequest = doc.data();

          if (updatedRequest.status === "completed") {
            console.log("AI processing completed for", updatedRequest.fileName);

            // Extract apple and tree detections from Firestore
            const predictions = {
              detections: updatedRequest.appleDetections || [],
              tree_detections: updatedRequest.treeDetections || [],
              appleDetections: updatedRequest.appleDetections || {},
            };

            // Update the state with AI predictions
            setProcessedImages((prev) => {
              const updatedImages = prev.map((img) =>
                img.aiRequestId === id
                  ? {
                      ...img,
                      isProcessing: false,
                      output: predictions,
                      processedImage: updatedRequest.visualizations[0] || null,
                      error: null,
                    }
                  : img
              );

              // If all images are processed, move directly to the "Processing Complete" step (Step 3)
              const allImagesProcessed = updatedImages.every(
                (img) => !img.isProcessing
              );
              if (allImagesProcessed) {
                console.log("All images processed, moving to 'Processing Complete'");
                setCurrentStep(3); // Move to "Processing complete" step
              }

              return updatedImages;
            });

            // Update the uploadedItems state to include the AI predictions
            setUploadedItems((prev) =>
              prev.map((item) =>
                item.id === updatedRequest.tokenId
                  ? {
                      ...item,
                      predictions: predictions, // Attach predictions to the item
                    }
                  : item
              )
            );
          } else if (updatedRequest.status === "error") {
            // Handle AI processing errors
            console.error(`Error in AI processing for ${updatedRequest.fileName}: ${updatedRequest.error}`);

            setProcessedImages((prev) => {
              const updatedImages = prev.map((img) =>
                img.aiRequestId === id
                  ? {
                      ...img,
                      isProcessing: false,
                      error: updatedRequest.error,
                    }
                  : img
              );

              const allImagesProcessed = updatedImages.every(
                (img) => !img.isProcessing
              );
              if (allImagesProcessed) {
                console.log("All images processed (including errors)");
                setCurrentStep(3);
              }

              return updatedImages;
            });
          }
        }
      });
    });

    // Clean up the Firestore listeners when the component unmounts or processing completes
    useEffect(() => {
      return () => {
        unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
      };
    }, []);
  };

  const handlePrediction = async () => {
    console.log("Starting prediction process");
    setCurrentStep(2); // Move to "Process files" immediately
    const initialProcessedImages = selectedImages.map((image) => ({
      id: image.id,
      file: new File([], image.fileName),
      image: image.downloadURL,
      output: null,
      processedImage: null,
      isProcessing: true,
      error: null,
    }));
    setProcessedImages(initialProcessedImages);

    await processImages(selectedImages);
  };

  const resetWizard = () => {
    console.log("Resetting wizard");
    setCurrentStep(1);
    setSelectedImages([]);
    setProcessedImages([]);
  };

  const handleFolderClick = (folderId: string, folderName: string) => {
    setCurrentFolderId(folderId);
    setFolderPath((prevPath) => [
      ...prevPath,
      { id: folderId, name: folderName },
    ]);
    setSelectedImages([]);
  };

  const handleFolderPathClick = (index: number) => {
    const newPath = folderPath.slice(0, index + 1);
    setFolderPath(newPath);
    setCurrentFolderId(newPath[newPath.length - 1].id);
    setSelectedImages([]);
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "";
    return format(new Date(dateStr), "dd/MM/yyyy HH:mm:ss");
  };

  const formatSize = (size: number | undefined) => {
    if (size === undefined) return "";
    const i = Math.floor(Math.log(size) / Math.log(1024));
    const formattedSize = size / Math.pow(1024, i);
    return `${formattedSize.toFixed(2)} ${["B", "kB", "MB", "GB", "TB"][i]}`;
  };

  const renderUploadedItems = () => {
    console.log("Rendering uploaded items");
    if (isLoading) {
      return (
        <div className="fixed inset-0 flex justify-center items-center z-50 bg-background/80 backdrop-blur-sm">
          <l-line-spinner
            size="40"
            stroke="3"
            speed="1"
            color="#8BC34A"
          ></l-line-spinner>
        </div>
      );
    }

    if (uploadedItems.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-center py-4">
            No items found in this folder. Please upload some new images or
            create folders.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
        {uploadedItems.map((item) => (
          <Card
            className="group w-full max-w-[150px]"
            key={item.id}
            style={{
              background: `radial-gradient(63.94% 63.94% at 50% 0%, rgba(255, 99, 71, 0.1) 0%, rgba(132, 204, 22, 0) 100%), rgba(132, 204, 22, 0.01)`,
              backdropFilter: "blur(16px)",
            }}
          >
            <CardContent
              onClick={() =>
                item.isFolder
                  ? handleFolderClick(item.id, item.folderName || "")
                  : handleImageSelect(item)
              }
              className="flex flex-col items-center justify-center p-2 cursor-pointer aspect-square"
            >
              {item.isFolder ? (
                <div className="flex flex-col items-center gap-2">
                  <FolderIcon className="h-12 w-12 text-muted-foreground" />
                  <div className="text-sm font-medium">{item.folderName}</div>
                  <div className="text-xs text-gray-500">
                    {formatDate(item.createdAt)}
                  </div>
                </div>
              ) : (
                <>
                  <div className="absolute top-[7.1rem] right-0 z-20 opacity-75 bg-rose-200">
                    <Badge className="px-2 py-1 truncate text-xs rounded-sm w-[132px]">
                      {item.fileName}
                    </Badge>
                  </div>
                  <Image
                    src={
                      item.downloadURL ||
                      "/placeholder.svg?height=300&width=300"
                    }
                    alt={item.fileName || "Image"}
                    width={300}
                    height={300}
                    className="object-cover rounded-md"
                    style={{ aspectRatio: "500/500", objectFit: "cover" }}
                  />
                  <div className="flex flex-col items-center justify-center mt-2">
                    <div className="text-xs text-gray-800 dark:text-gray-300">
                      {formatDate(item.createdAt)}
                    </div>
                    <div className="text-xs text-gray-800 dark:text-gray-300">
                      {formatSize(item.fileSize)}
                    </div>
                  </div>
                </>
              )}
              {!item.isFolder &&
                selectedImages.some((img) => img.id === item.id) && (
                  <div className="absolute inset-0 flex border-custom border-2 rounded-lg items-center justify-center">
                    <AppleIcon className="text-custom" size={30} />
                  </div>
                )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderImageContainer = (image: ProcessedImage) => {
    const getTotalApplesForImage = (appleDetections: { [key: string]: number }) => {
      return Object.values(appleDetections).reduce((sum, count) => sum + Math.ceil(count), 0);
    };

    return (
      <div className="w-full aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden relative">
        {image.processedImage ? (
          <Image
            src={image.processedImage}
            alt="Processed image with annotations"
            layout="fill"
            objectFit="cover"
            onClick={() => setSelectedImage(image.processedImage)}
            className="cursor-pointer"
          />
        ) : (
          <Image
            src={image.image || "/placeholder.svg?height=300&width=400"}
            alt="Original image"
            layout="fill"
            objectFit="cover"
          />
        )}

        {image.error && (
          <div className="absolute inset-0 bg-red-500 bg-opacity-50 flex items-center justify-center">
            <div className="text-white text-center">{image.error}</div>
          </div>
        )}

        {image.output && (
          <Collapsible triggerText="Detection Details">
            <div className="mt-2 space-y-2">
              <h4>Apple Detections:</h4>
              <p>Total Apples: {getTotalApplesForImage(image.output.appleDetections)}</p>
              <p>Apples per tree:</p>
              <ul>
                {Object.entries(image.output.appleDetections).map(([treeId, count], index) => (
                  <li key={treeId}>Tree {index + 1}: {Math.ceil(count)}</li>
                ))}
              </ul>
              <h4>Tree Detections:</h4>
              <p>Trees detected: {image.output.tree_detections.length}</p>
            </div>
          </Collapsible>
        )}

        <Button 
          onClick={() => setSelectedImage(image.processedImage)}
          className="absolute bottom-2 right-2"
          variant="secondary"
        >
          View Full Image
        </Button>
      </div>
    );
  };

  const getTotalTrees = () => {
    return processedImages.reduce((total, image) => {
      return total + (image.output?.tree_detections.length || 0);
    }, 0);
  };

  const getTotalApples = () => {
    return processedImages.reduce((total, image) => {
      if (image.output && image.output.appleDetections) {
        const imageTotalApples = Object.values(image.output.appleDetections).reduce((sum, count) => sum + Math.ceil(count), 0);
        return total + imageTotalApples;
      }
      return total;
    }, 0);
  };

  const renderStepContent = () => {
    console.log("Rendering step content for step:", currentStep);
    const totalProcessedImages = processedImages.filter(
      (img) => !img.isProcessing
    ).length;
    const totalTrees = getTotalTrees();
    const totalApples = getTotalApples();

    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {folderPath.map((folder, index) => (
                <React.Fragment key={folder.id}>
                  {index > 0 && <ChevronRight className="w-4 h-4" />}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFolderPathClick(index)}
                  >
                    {folder.name}
                  </Button>
                </React.Fragment>
              ))}
            </div>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm sm:text-lg text-muted-foreground">
                Select one or more images to get started!
              </p>
              <Button onClick={handleSelectAll} variant="outline">
                {selectedImages.length ===
                uploadedItems.filter((item) => !item.isFolder).length
                  ? "Deselect All"
                  : "Select All"}
              </Button>
            </div>
            <div
              className="overflow-y-auto pr-4"
              style={{ height: "calc(100vh - 300px)" }}
            >
              {renderUploadedItems()}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground">Processing...</p>
            <div
              className="overflow-y-auto pr-4"
              style={{ height: "calc(100vh - 250px)" }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {processedImages.map((image) => (
                  <Card key={image.id}>
                    <CardContent className="p-4">
                      {renderImageContainer(image)}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground">Processing complete!</p>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <span>Processed Images: {totalProcessedImages}</span>
              <div className="flex flex-wrap items-center gap-4 mt-2 sm:mt-0">
                <div className="flex items-center space-x-2">
                  <TreePineIcon className="text-primary" size={20} />
                  <span>Trees: {totalTrees}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <AppleIcon className="text-primary" size={20} />
                  <span>Apples: {totalApples}</span>
                </div>
              </div>
            </div>
            <Button onClick={() => setCurrentStep(4)} className="mt-4">
              View Detailed Results
            </Button>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground">Detailed Results</p>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
              <span>Total Processed Images: {totalProcessedImages}</span>
              <div className="flex flex-wrap items-center gap-4 mt-2 sm:mt-0">
                <div className="flex items-center space-x-2">
                  <TreePineIcon className="text-primary" size={20} />
                  <span>Total Trees: {totalTrees}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <AppleIcon className="text-primary" size={20} />
                  <span>Total Apples: {totalApples}</span>
                </div>
              </div>
            </div>
            <div
              className="overflow-y-auto pr-4"
              style={{ height: "calc(100vh - 250px)" }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {processedImages.map((image) => (
                  <Card key={image.id}>
                    <CardContent className="p-4">
                      {renderImageContainer(image)}
                      {image.output && (
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center space-x-2">
                            <AppleIcon className="text-primary" />
                            <span className="text-lg font-bold">
                              Total Apples: {Object.values(image.output.appleDetections).reduce((sum, count) => sum + Math.ceil(count), 0)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <TreePineIcon className="text-primary" />
                            <span className="text-lg font-bold ">
                              Trees detected: {image.output.tree_detections.length}
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const handleImageLoad = useCallback((image: HTMLImageElement) => {
    setImageDimensions({ width: image.naturalWidth, height: image.naturalHeight });
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-hidden">
        <div className="sticky top-0 z-10 pt-4 pb-4">
          <div className="flex items-center space-x-2">
            {steps.map((step, index) => (
              <React.Fragment key={index}>
                <div
                  className={`flex items-center space-x-2 ${
                    currentStep > index + 1
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      currentStep > index + 1
                        ? "bg-primary text-primary-foreground"
                        : "border border-muted-foreground"
                    }`}
                  >
                    {currentStep > index + 1 ? (
                      <CheckIcon className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span>{step.title}</span>
                  <span className="sr-only">{step.description}</span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-px ${
                      currentStep > index + 1
                        ? "bg-primary"
                        : "bg-muted-foreground"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="mt-4 overflow-hidden">{renderStepContent()}</div>
      </div>

      <div className="sticky bottom-0 left-0 right-0 z-10">
        <div className="flex justify-between items-center">
          <Button
            onClick={() => {
              console.log("Moving to previous step");
              setCurrentStep(Math.max(1, currentStep - 1));
            }}
            disabled={currentStep === 1 || currentStep === 2}
            variant="outline"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          <Button
            onClick={() => {
              if (currentStep === 1 && selectedImages.length > 0) {
                console.log("Starting prediction process");
                handlePrediction();
              } else if (currentStep === 3) {
                console.log("Viewing results");
                setCurrentStep(4);
              } else if (currentStep === 4) {
                console.log("Resetting wizard");
                resetWizard();
              }
            }}
            disabled={
              currentStep === 2 ||
              (currentStep === 1 && selectedImages.length === 0)
            }
          >
            {currentStep === 1 ? "Process Images" : 
             currentStep === 2 ? "Processing..." : 
             currentStep === 3 ? "View Results" : "Finish"}
            {currentStep === 1 && <ChevronRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </div>

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="p-0 overflow-hidden bg-transparent max-w-[80vw] max-h-[80vh] w-auto h-auto inset-auto top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          {selectedImage && (
            <div className="relative flex items-center justify-center w-full h-full bg-black bg-opacity-75 rounded-lg">
              <div 
                className="relative"
                style={{
                  width: `${Math.min(imageDimensions.width, window.innerWidth * 0.7, 1200)}px`,
                  height: `${Math.min(imageDimensions.height, window.innerHeight * 0.6, 600)}px`,
                  maxWidth: '100%',
                  maxHeight: '100%',
                }}
              >
                <Image
                  src={selectedImage}
                  alt="Full size processed image"
                  layout="fill"
                  objectFit="contain"
                  quality={100}
                  onLoadingComplete={handleImageLoad}
                />
              </div>
              <Button 
                className="absolute top-2 right-2 z-10 p-2 bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full"
                onClick={() => setSelectedImage(null)}
              >
                <X className="w-6 h-6" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}