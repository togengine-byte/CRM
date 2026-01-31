import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Cloud, 
  Trash2, 
  RefreshCw, 
  HardDrive,
  File,
  Folder,
  Search,
  AlertTriangle,
  Loader2,
  Download,
  Image,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

interface S3File {
  key: string;
  size: number;
  lastModified: string;
  folder: string;
}

interface S3Stats {
  totalFiles: number;
  totalSizeMb: number;
  byFolder: Record<string, { count: number; sizeMb: number }>;
}

export function S3StorageSettings() {
  const [files, setFiles] = useState<S3File[]>([]);
  const [stats, setStats] = useState<S3Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [folderFilter, setFolderFilter] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch files and stats
  const fetchData = async () => {
    setLoading(true);
    try {
      const [filesRes, statsRes] = await Promise.all([
        fetch('/api/s3/files'),
        fetch('/api/s3/stats'),
      ]);
      
      if (filesRes.ok) {
        const data = await filesRes.json();
        setFiles(data.files || []);
      }
      
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats({
          totalFiles: data.totalFiles,
          totalSizeMb: data.totalSizeMb,
          byFolder: data.byFolder,
        });
      }
    } catch (error) {
      console.error('Error fetching S3 data:', error);
      toast.error("שגיאה בטעינת נתוני S3");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter files
  const filteredFiles = files.filter(file => {
    const matchesSearch = !searchQuery || 
      file.key.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder = !folderFilter || file.folder === folderFilter;
    return matchesSearch && matchesFolder;
  });

  // Get unique folders
  const folders = Array.from(new Set(files.map(f => f.folder)));

  // Toggle file selection
  const toggleFileSelection = (key: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedFiles(newSelected);
  };

  // Select all visible files
  const selectAllVisible = () => {
    const newSelected = new Set(selectedFiles);
    filteredFiles.forEach(f => newSelected.add(f.key));
    setSelectedFiles(newSelected);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedFiles(new Set());
  };

  // Delete selected files
  const handleDeleteSelected = async () => {
    if (selectedFiles.size === 0) return;
    
    setDeleting(true);
    try {
      const response = await fetch('/api/s3/delete-multiple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: Array.from(selectedFiles) }),
      });

      if (response.ok) {
        const data = await response.json();
        const successCount = data.results.filter((r: any) => r.success).length;
        toast.success(`נמחקו ${successCount} קבצים בהצלחה`);
        setSelectedFiles(new Set());
        fetchData();
      } else {
        toast.error("שגיאה במחיקת הקבצים");
      }
    } catch (error) {
      console.error('Error deleting files:', error);
      toast.error("שגיאה במחיקת הקבצים");
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get file icon
  const getFileIcon = (key: string) => {
    const ext = key.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'tiff', 'tif'].includes(ext || '')) {
      return <Image className="h-4 w-4 text-blue-500" />;
    }
    if (['pdf', 'ai', 'eps', 'psd'].includes(ext || '')) {
      return <FileText className="h-4 w-4 text-red-500" />;
    }
    return <File className="h-4 w-4 text-slate-500" />;
  };

  // Get folder color
  const getFolderColor = (folder: string) => {
    const colors: Record<string, string> = {
      quotes: 'bg-blue-100 text-blue-800',
      works: 'bg-green-100 text-green-800',
      suppliers: 'bg-purple-100 text-purple-800',
      customers: 'bg-orange-100 text-orange-800',
      uploads: 'bg-slate-100 text-slate-800',
    };
    return colors[folder] || 'bg-slate-100 text-slate-800';
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">סה״כ קבצים</p>
                <p className="text-2xl font-bold text-blue-600">
                  {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats?.totalFiles || 0}
                </p>
              </div>
              <Cloud className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">נפח אחסון</p>
                <p className="text-2xl font-bold text-green-600">
                  {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : `${stats?.totalSizeMb || 0} MB`}
                </p>
              </div>
              <HardDrive className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">תיקיות</p>
                <p className="text-2xl font-bold text-purple-600">
                  {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : folders.length}
                </p>
              </div>
              <Folder className="h-8 w-8 text-purple-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">נבחרו</p>
                <p className="text-2xl font-bold text-orange-600">
                  {selectedFiles.size}
                </p>
              </div>
              <Trash2 className="h-8 w-8 text-orange-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Folder Stats */}
      {stats?.byFolder && Object.keys(stats.byFolder).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Folder className="h-5 w-5" />
              נפח לפי תיקייה
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.entries(stats.byFolder).map(([folder, data]) => (
                <button
                  key={folder}
                  onClick={() => setFolderFilter(folderFilter === folder ? null : folder)}
                  className={`px-3 py-2 rounded-lg border transition-all ${
                    folderFilter === folder 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Badge className={getFolderColor(folder)}>{folder}</Badge>
                    <span className="text-sm text-slate-600">{data.count} קבצים</span>
                    <span className="text-sm font-medium">{data.sizeMb} MB</span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Files Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <File className="h-5 w-5" />
                קבצים ב-S3
              </CardTitle>
              <CardDescription>ניהול קבצים באחסון Amazon S3</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
                רענן
              </Button>
              {selectedFiles.size > 0 && (
                <>
                  <Button variant="outline" size="sm" onClick={clearSelection}>
                    נקה בחירה
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4 ml-2" />
                    מחק {selectedFiles.size} קבצים
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="חיפוש קבצים..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <Button variant="outline" size="sm" onClick={selectAllVisible}>
              בחר הכל ({filteredFiles.length})
            </Button>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Cloud className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">אין קבצים</h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery || folderFilter ? "לא נמצאו קבצים התואמים לחיפוש" : "אין קבצים באחסון S3"}
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-right"></TableHead>
                    <TableHead className="text-right">קובץ</TableHead>
                    <TableHead className="text-right">תיקייה</TableHead>
                    <TableHead className="text-right">גודל</TableHead>
                    <TableHead className="text-right">תאריך</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFiles.slice(0, 100).map((file) => (
                    <TableRow 
                      key={file.key}
                      className={selectedFiles.has(file.key) ? 'bg-blue-50' : ''}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedFiles.has(file.key)}
                          onCheckedChange={() => toggleFileSelection(file.key)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getFileIcon(file.key)}
                          <span className="text-sm truncate max-w-[300px]" title={file.key}>
                            {file.key.split('/').pop()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getFolderColor(file.folder)}>{file.folder}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatSize(file.size)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(file.lastModified)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredFiles.length > 100 && (
                <div className="p-3 text-center text-sm text-muted-foreground border-t">
                  מוצגים 100 מתוך {filteredFiles.length} קבצים
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              אישור מחיקה
            </DialogTitle>
            <DialogDescription>
              האם אתה בטוח שברצונך למחוק {selectedFiles.size} קבצים?
              <br />
              <strong className="text-red-600">פעולה זו אינה ניתנת לביטול!</strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={deleting}>
              ביטול
            </Button>
            <Button variant="destructive" onClick={handleDeleteSelected} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  מוחק...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 ml-2" />
                  מחק {selectedFiles.size} קבצים
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
