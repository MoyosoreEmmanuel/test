"use client";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  collection,
  query,
  where,
  deleteDoc,
  doc,
  writeBatch,
  orderBy,
  onSnapshot,
  getDocs,
} from "firebase/firestore";
import { useAuth } from "@clerk/nextjs";
import { database} from "@/firebaseConfig";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Trash2, RefreshCw, AppleIcon, TreePineIcon } from "lucide-react";
import AppleDetectionDialog from "./components/AppleDetectionDialog";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { groupBy } from "lodash";
import { useUser } from "@clerk/nextjs";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Image from 'next/image';

interface Detection {
  confidence: number;
  box: number[];
  class?: string;
}

interface AIRequest {
  id: string;
  fileName: string;
  downloadURL: string;
  createdAt: string;
  processingStartTime: Date;
  processingEndTime: Date;
  status: string;
  tokenId: string;
  userId: string;
  appleDetections?: { [key: string]: number };
  treeDetections?: Detection[];
  visualizations: string[];
  blockId: string;
}

export default function AiHistory() {
  const { userId } = useAuth();
  const { user } = useUser();
  const [aiRequests, setAIRequests] = useState<AIRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [deleteAllConfirmation, setDeleteAllConfirmation] = useState("");
  const [timeFrame, setTimeFrame] = useState("all");
  const [groupedRequests, setGroupedRequests] = useState<{ [key: string]: AIRequest[] }>({});
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<{ id: string; name: string }[]>([]);
  const [blockNames, setBlockNames] = useState<{ [key: string]: string }>({});

  const { totalApples, totalTrees } = useMemo(() => {
    const requests = selectedBlock ? groupedRequests[selectedBlock] || [] : aiRequests;
    return requests.reduce(
      (acc, request) => ({
        totalApples: acc.totalApples + Object.values(request.appleDetections ?? {}).reduce((sum, count) => sum + Math.ceil(count), 0),
        totalTrees: acc.totalTrees + (request.treeDetections?.length ?? 0),
      }),
      { totalApples: 0, totalTrees: 0 }
    );
  }, [selectedBlock, groupedRequests, aiRequests]);

  const filterRequestsByDateRange = (requests: AIRequest[], start: Date | null, end: Date | null) => {
    if (!start && !end) return requests;
    return requests.filter(request => {
      const requestDate = new Date(request.createdAt);
      if (start && end) {
        return requestDate >= start && requestDate <= end;
      } else if (start) {
        return requestDate >= start;
      } else if (end) {
        return requestDate <= end;
      }
      return true;
    });
  };

  const fetchAIRequests = useCallback((retryCount = 0) => {
    if (!userId || !user) {
      console.error("User not authenticated");
      toast({
        title: "Authentication Error",
        description: "Please sign in to view your AI history.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    console.log("Fetching AI requests for user:", userId);

    const q = query(
      collection(database, "aiRequests"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    let localUnsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        console.log("Query snapshot size:", querySnapshot.size);
        const requestsData = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            blockId: data.blockId || "Unknown Block",
            processingStartTime: data.processingStartTime?.toDate(),
            processingEndTime: data.processingEndTime?.toDate(),
          } as AIRequest; // Use type assertion here
        });

        const filteredRequests = filterRequestsByDateRange(requestsData, startDate, endDate);
        
        const groupedByBlock = groupBy(filteredRequests, (request) => request.blockId);
        setGroupedRequests(groupedByBlock);

        // Extract unique blocks
        const uniqueBlocks = Array.from(new Set(filteredRequests.map(r => r.blockId)))
          .map(blockId => ({ id: blockId, name: blockId }));
        setBlocks(uniqueBlocks);

        setAIRequests(filteredRequests);
        setLoading(false);
        setRefreshing(false);
      },
      (error) => {
        console.error("Error fetching AI requests:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        
        if (retryCount < 3) {
          console.log(`Retrying... Attempt ${retryCount + 1}`);
          setTimeout(() => fetchAIRequests(retryCount + 1), 1000 * (retryCount + 1));
        } else {
          setError(`Failed to fetch AI requests after multiple attempts: ${error.message}`);
          setLoading(false);
          setRefreshing(false);
          toast({
            title: "Error",
            description: `Failed to fetch AI requests after multiple attempts: ${error.message}`,
            variant: "destructive",
          });
        }
      }
    );

    setUnsubscribe(() => localUnsubscribe);
    return localUnsubscribe;
  }, [userId, user, toast, startDate, endDate]);

  const fetchBlockNames = useCallback(async () => {
    if (!userId) return;

    const filesCollection = collection(database, "files");
    const blocksQuery = query(
      filesCollection,
      where("userId", "==", userId),
      where("isFolder", "==", true)
    );
    const blocksSnapshot = await getDocs(blocksQuery);

    const blockNameMap: { [key: string]: string } = {};
    blocksSnapshot.forEach((doc) => {
      const blockData = doc.data();
      blockNameMap[doc.id] = blockData.folderName || doc.id;
    });

    setBlockNames(blockNameMap);
    console.log("Block names:", blockNameMap); // Add this line
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchBlockNames();
      const unsubscribeFunc = fetchAIRequests();
      return () => {
        if (unsubscribeFunc) {
          unsubscribeFunc();
        }
      };
    }
  }, [userId, fetchAIRequests, fetchBlockNames]);

  const formatDate = useCallback((dateStr: string) => {
    return format(new Date(dateStr), "dd/MM/yyyy HH:mm:ss");
  }, []);

  const handleDelete = useCallback(
    async (requestId: string, fileName: string) => {
      setDeletingId(requestId);
      try {
        await deleteDoc(doc(database, "aiRequests", requestId));
        toast({
          title: "Request Deleted",
          description: `${fileName} has been successfully deleted.`,
        });
      } catch (error) {
        console.error("Error deleting request:", error);
        toast({
          title: "Error",
          description: `Failed to delete ${fileName}. Please try again.`,
          variant: "destructive",
        });
      } finally {
        setDeletingId(null);
      }
    },
    [toast]
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAIRequests();
  }, [fetchAIRequests]);

  const handleDeleteAll = useCallback(async () => {
    if (deleteAllConfirmation !== "DELETE-ALL-HISTORY") {
      toast({
        title: "Error",
        description: "Please enter the correct confirmation text.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const batch = writeBatch(database);
      aiRequests.forEach((request) => {
        const requestRef = doc(database, "aiRequests", request.id);
        batch.delete(requestRef);
      });
      await batch.commit();
      toast({
        title: "All Requests Deleted",
        description: "All AI requests have been successfully deleted.",
      });
    } catch (error) {
      console.error("Error deleting all requests:", error);
      toast({
        title: "Error",
        description: "Failed to delete all requests. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setIsDeleteAllModalOpen(false);
      setDeleteAllConfirmation("");
    }
  }, [deleteAllConfirmation, aiRequests, toast]);

  const formatProcessingTime = (start: Date, end: Date) => {
    if (!start || !end) return "N/A";
    const diff = end.getTime() - start.getTime();
    return format(new Date(diff), "mm:ss");
  };

  const renderBlockResults = useCallback(() => {
    if (!selectedBlock) {
      return <p>Please select a block to view its history.</p>;
    }

    const requests = groupedRequests[selectedBlock] || [];

    return (
      <div key={selectedBlock} className="mb-8">
        <h2 className="text-2xl font-bold mb-4">
          Block: {blockNames[selectedBlock] || selectedBlock}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {requests.map((request) => (
            <Card key={request.id}>
              <CardContent className="p-4">
                <Image
                  src={request.visualizations?.[0] || request.downloadURL || '/placeholder-image.jpg'}
                  alt={request.fileName}
                  width={300}
                  height={200}
                  className="w-full h-48 object-cover mb-2 rounded"
                />
                <h3 className="font-semibold truncate">{request.fileName}</h3>
                <p className="text-sm text-gray-500">{formatDate(request.createdAt)}</p>
                <div className="flex items-center space-x-2 mt-2">
                  <AppleIcon className="text-red-500" size={16} />
                  <span>Apples: {
                    Object.values(request.appleDetections ?? {}).reduce((sum, count) => sum + Math.ceil(count), 0)
                  }</span>
                </div>
                <div className="flex items-center space-x-2">
                  <TreePineIcon className="text-green-500" size={16} />
                  <span>Trees: {request.treeDetections?.length ?? 0}</span>
                </div>
                <AppleDetectionDialog
                  imageUrl={request.visualizations?.[0] || request.downloadURL || '/placeholder-image.jpg'}
                  detections={[
                    ...(request.appleDetections ? Object.entries(request.appleDetections).map(([key, value]) => ({ class: "apple", confidence: value, box: [] })) : []),
                    ...(request.treeDetections?.map((d) => ({ ...d, class: "tree" })) || []),
                  ]}
                />
                <p className="mt-2">
                  Status: <Badge>{request.status}</Badge>
                </p>
                <p>Processing Time: {formatProcessingTime(request.processingStartTime, request.processingEndTime)}</p>
                <Button
                  variant="destructive"
                  size="sm"
                  className="mt-2"
                  onClick={() => handleDelete(request.id, request.fileName)}
                  disabled={deletingId === request.id}
                >
                  {deletingId === request.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }, [groupedRequests, selectedBlock, formatDate, handleDelete, deletingId, blockNames]);

  if (!userId || !user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Please sign in to view your AI history.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Error: {error}. Please try refreshing the page.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="p-4 bg-background">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
          <h1 className="text-3xl font-bold mb-4 sm:mb-0">AI Detection History</h1>
          <div className="space-x-2 flex items-center">
            <DatePicker
              selected={startDate}
              onChange={(date) => setStartDate(date)}
              selectsStart
              startDate={startDate ?? undefined}
              endDate={endDate ?? undefined}
              placeholderText="Start Date"
              className="border rounded p-2"
            />
            <DatePicker
              selected={endDate}
              onChange={(date) => setEndDate(date ?? null)}
              selectsEnd
              startDate={startDate ?? undefined}
              endDate={endDate ?? undefined}
              minDate={startDate ?? undefined}
              placeholderText="End Date"
              className="border rounded p-2"
            />
            <Button onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
            <Button variant="destructive" onClick={() => setIsDeleteAllModalOpen(true)} disabled={aiRequests.length === 0}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete All
            </Button>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <AppleIcon className="text-red-500" size={20} />
              <span className="font-semibold">Total Apples: {totalApples}</span>
            </div>
            <div className="flex items-center space-x-2">
              <TreePineIcon className="text-green-500" size={20} />
              <span className="font-semibold">Total Trees: {totalTrees}</span>
            </div>
          </div>
          <Select 
            value={selectedBlock || 'all'} 
            onValueChange={(value: string) => {
              console.log("Selected block:", value); // Add this line
              setSelectedBlock(value === 'all' ? null : value);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select a block">
                {selectedBlock ? blockNames[selectedBlock] || selectedBlock : "All Blocks"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Blocks</SelectItem>
              {Object.entries(blockNames).map(([blockId, blockName]) => (
                <SelectItem key={blockId} value={blockId}>
                  {blockName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-grow overflow-auto p-4">
        {renderBlockResults()}
      </div>

      <div className="p-4 bg-background border-t">
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <div>
            1-{Math.min(aiRequests.length, 1000)} of {aiRequests.length}
          </div>
        </div>
      </div>

      <Dialog open={isDeleteAllModalOpen} onOpenChange={setIsDeleteAllModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete All Requests</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Please type &quot;DELETE-ALL-HISTORY&quot; to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={deleteAllConfirmation}
            onChange={(e) => setDeleteAllConfirmation(e.target.value)}
            placeholder="Type DELETE-ALL-HISTORY"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteAllModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAll}>
              Delete All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}
