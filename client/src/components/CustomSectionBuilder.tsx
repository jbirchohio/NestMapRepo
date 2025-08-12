import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GripVertical, Eye, Edit3 } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProvided, DraggableProvided, DraggableStateSnapshot } from "@hello-pangea/dnd";

interface CustomSection {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'list' | 'image' | 'table';
  order: number;
  enabled: boolean;
}

interface CustomSectionBuilderProps {
  sections: CustomSection[];
  onChange: (sections: CustomSection[]) => void;
}

export default function CustomSectionBuilder({ sections, onChange }: CustomSectionBuilderProps) {
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const addSection = (type: 'text' | 'list' | 'image' | 'table') => {
    const newSection: CustomSection = {
      id: `section_${Date.now()}`,
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Section`,
      content: type === 'list' ? '• Item 1\n• Item 2\n• Item 3' :
               type === 'table' ? 'Header 1 | Header 2 | Header 3\n--- | --- | ---\nRow 1 Col 1 | Row 1 Col 2 | Row 1 Col 3' :
               'Enter your content here...',
      type,
      order: sections.length,
      enabled: true
    };
    onChange([...sections, newSection]);
    setEditingSection(newSection.id);
  };

  const updateSection = (id: string, updates: Partial<CustomSection>) => {
    onChange(sections.map(section =>
      section.id === id ? { ...section, ...updates } : section
    ));
  };

  const deleteSection = (id: string) => {
    onChange(sections.filter(section => section.id !== id));
    if (editingSection === id) {
      setEditingSection(null);
    }
  };

  const reorderSections = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(sections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order values
    const reorderedItems = items.map((item, index) => ({
      ...item,
      order: index
    }));

    onChange(reorderedItems);
  };

  const sectionTypes = [
    { value: 'text', label: 'Text Block', description: 'Rich text content' },
    { value: 'list', label: 'Bulleted List', description: 'List of items' },
    { value: 'image', label: 'Image Gallery', description: 'Images with captions' },
    { value: 'table', label: 'Data Table', description: 'Structured data' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Custom Sections</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Add custom sections to your proposal template
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center space-x-2">
            <Switch checked={previewMode} onCheckedChange={setPreviewMode} />
            <Label>Preview Mode</Label>
          </div>
          <Select onValueChange={(value) => addSection(value as any)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Add Section" />
            </SelectTrigger>
            <SelectContent>
              {sectionTypes.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  <div>
                    <div className="font-medium">{type.label}</div>
                    <div className="text-xs text-gray-500">{type.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Sections List */}
      {sections.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Edit3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No custom sections yet
              </h4>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Add custom sections to make your proposals more comprehensive
              </p>
              <div className="flex justify-center gap-2">
                {sectionTypes.slice(0, 2).map(type => (
                  <Button
                    key={type.value}
                    variant="outline"
                    onClick={() => addSection(type.value as any)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {type.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <DragDropContext onDragEnd={reorderSections}>
          <Droppable droppableId="sections">
            {(provided: DroppableProvided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-4"
              >
                {sections
                  .sort((a, b) => a.order - b.order)
                  .map((section, index) => (
                    <Draggable
                      key={section.id}
                      draggableId={section.id}
                      index={index}
                    >
                      {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                        <Card
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`${
                            snapshot.isDragging ? 'shadow-lg' : ''
                          } ${!section.enabled ? 'opacity-50' : ''}`}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div
                                  {...provided.dragHandleProps}
                                  className="cursor-grab hover:cursor-grabbing"
                                >
                                  <GripVertical className="w-4 h-4 text-gray-400" />
                                </div>
                                <div>
                                  <CardTitle className="text-base">
                                    {section.title}
                                  </CardTitle>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="secondary" className="text-xs">
                                      {section.type}
                                    </Badge>
                                    <span className="text-xs text-gray-500">
                                      Order: {section.order + 1}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={section.enabled}
                                  onCheckedChange={(enabled) =>
                                    updateSection(section.id, { enabled })
                                  }
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setEditingSection(
                                      editingSection === section.id ? null : section.id
                                    )
                                  }
                                >
                                  <Edit3 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deleteSection(section.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>

                          <CardContent>
                            {editingSection === section.id ? (
                              <div className="space-y-4">
                                <div>
                                  <Label>Section Title</Label>
                                  <Input
                                    value={section.title}
                                    onChange={(e) =>
                                      updateSection(section.id, { title: e.target.value })
                                    }
                                    placeholder="Enter section title"
                                  />
                                </div>
                                <div>
                                  <Label>Content</Label>
                                  <Textarea
                                    value={section.content}
                                    onChange={(e) =>
                                      updateSection(section.id, { content: e.target.value })
                                    }
                                    placeholder={
                                      section.type === 'list' ? 'Enter items separated by new lines (use • for bullets)' :
                                      section.type === 'table' ? 'Use | to separate columns and --- for headers' :
                                      'Enter your content here...'
                                    }
                                    rows={6}
                                  />
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingSection(null)}
                                  >
                                    Done
                                  </Button>
                                </div>
                              </div>
                            ) : previewMode ? (
                              <SectionPreview section={section} />
                            ) : (
                              <div className="text-sm text-gray-600 dark:text-gray-300">
                                {section.content.length > 100
                                  ? `${section.content.substring(0, 100)}...`
                                  : section.content}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </Draggable>
                  ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
}

function SectionPreview({ section }: { section: CustomSection }) {
  const renderContent = () => {
    switch (section.type) {
      case 'list':
        const items = section.content.split('\n').filter(item => item.trim());
        return (
          <ul className="space-y-1">
            {items.map((item, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="w-1 h-1 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                <span>{item.replace(/^[•\-*]\s*/, '')}</span>
              </li>
            ))}
          </ul>
        );

      case 'table':
        const lines = section.content.split('\n').filter(line => line.trim());
        if (lines.length < 2) return <div className="text-gray-500">Invalid table format</div>;

        const headers = lines[0].split('|').map(h => h.trim());
        const rows = lines.slice(2).map(line => line.split('|').map(cell => cell.trim()));

        return (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800">
                  {headers.map((header, index) => (
                    <th key={index} className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="border border-gray-300 dark:border-gray-600 px-3 py-2">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'image':
        return (
          <div className="text-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
            <Eye className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">Image placeholder</p>
            <p className="text-xs text-gray-400 mt-1">{section.content}</p>
          </div>
        );

      default:
        return (
          <div className="prose dark:prose-invert max-w-none">
            {section.content.split('\n').map((paragraph, index) => (
              <p key={index} className="mb-2 last:mb-0">
                {paragraph}
              </p>
            ))}
          </div>
        );
    }
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
      <h4 className="font-medium mb-3 text-gray-900 dark:text-white">
        {section.title}
      </h4>
      <div className="text-sm text-gray-700 dark:text-gray-300">
        {renderContent()}
      </div>
    </div>
  );
}