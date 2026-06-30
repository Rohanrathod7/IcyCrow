import { useState, useEffect, useRef } from 'preact/hooks';
import { Page } from 'react-pdf';

interface OutlineNode {
  title: string;
  pageNumber: number | null;
  items?: OutlineNode[];
}

interface OutlineItemProps {
  node: OutlineNode;
  depth: number;
  onJump: (page: number) => void;
}

function OutlineItem({ node, depth, onJump }: OutlineItemProps) {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = node.items && node.items.length > 0;

  const handleClick = () => {
    if (node.pageNumber) {
      onJump(node.pageNumber);
    }
  };

  return (
    <div style={{ paddingLeft: `${depth > 0 ? 8 : 0}px` }}>
      <div 
        onClick={handleClick}
        className={`outline-row ${node.pageNumber ? 'selectable' : ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '6px 8px',
          borderRadius: '8px',
          cursor: node.pageNumber ? 'pointer' : 'default',
          transition: 'all 0.2s',
          gap: '8px',
          marginBottom: '2px'
        }}
      >
        {hasChildren ? (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '16px',
              height: '16px',
              transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
              fontSize: '8px'
            }}
          >
            ▶
          </button>
        ) : (
          <div style={{ width: '16px' }} />
        )}
        <span 
          style={{ 
            flex: 1, 
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis',
            color: node.pageNumber ? '#ffffff' : 'rgba(255,255,255,0.4)',
            fontSize: '13px',
            fontWeight: depth === 0 ? 600 : 400
          }}
        >
          {node.title}
        </span>
        {node.pageNumber && (
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
            {node.pageNumber}
          </span>
        )}
      </div>
      {hasChildren && isOpen && (
        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', marginLeft: '14px' }}>
          {node.items!.map((child, index) => (
            <OutlineItem 
              key={index}
              node={child} 
              depth={depth + 1} 
              onJump={onJump} 
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ThumbnailItemProps {
  pageNumber: number;
  onJump: (page: number) => void;
}

function ThumbnailItem({ pageNumber, onJump }: ThumbnailItemProps) {
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      {
        rootMargin: '300px 0px 300px 0px', // Preload buffer in sidebar scroll
        threshold: 0.01
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      onClick={() => onJump(pageNumber)}
      className="thumbnail-item"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        padding: '12px',
        cursor: 'pointer',
        borderRadius: '12px',
        transition: 'all 0.2s',
        marginBottom: '12px',
        minHeight: '190px', // Preserves layout height when unloaded
        width: '144px',
        boxSizing: 'border-box'
      }}
    >
      <div style={{
        background: '#ffffff',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        borderRadius: '4px',
        overflow: 'hidden',
        width: '120px',
        aspectRatio: '0.707',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        height: '170px'
      }}>
        {isInView ? (
          <Page 
            pageNumber={pageNumber} 
            width={120}
            renderTextLayer={false} 
            renderAnnotationLayer={false}
            className="pdf-thumbnail-page"
          />
        ) : (
          <div style={{
            color: 'rgba(255,255,255,0.15)',
            fontSize: '11px',
            fontWeight: 600,
            fontFamily: 'system-ui, sans-serif'
          }}>
            Page {pageNumber}
          </div>
        )}
      </div>
      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
        Page {pageNumber}
      </span>
    </div>
  );
}

interface WorkspaceSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  tab: 'outline' | 'thumbnails';
  onTabChange: (tab: 'outline' | 'thumbnails') => void;
  outline: OutlineNode[];
  numPages: number;
  onJump: (pageNumber: number) => void;
}

export const WorkspaceSidebar = ({
  isOpen,
  onClose,
  tab,
  onTabChange,
  outline,
  numPages,
  onJump
}: WorkspaceSidebarProps) => {
  if (!isOpen) return null;

  return (
    <div className="workspace-sidebar">
      {/* 1. Left Icon Tab Bar */}
      <div className="sidebar-tab-bar">
        {/* Outline List View Tab Button */}
        <button 
          onClick={() => onTabChange('outline')}
          className={`sidebar-tab-btn ${tab === 'outline' ? 'active' : ''}`}
          title="Table of Contents"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
        </button>

        {/* Thumbnail Preview View Tab Button */}
        <button 
          onClick={() => onTabChange('thumbnails')}
          className={`sidebar-tab-btn ${tab === 'thumbnails' ? 'active' : ''}`}
          title="Page Thumbnails"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </button>
      </div>

      {/* 2. Right Scrollable Content Area */}
      <div className="sidebar-content-pane">
        {/* Header Section */}
        <div className="sidebar-header">
          <span style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.01em', color: '#fff' }}>
            {tab === 'outline' ? 'Table of Contents' : 'Page Thumbnails'}
          </span>
          <button 
            onClick={onClose}
            className="sidebar-close-btn"
            title="Close Sidebar"
          >
            ✕
          </button>
        </div>

        {/* List Content */}
        <div className="sidebar-body-list">
          {tab === 'outline' ? (
            outline.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {outline.map((node, index) => (
                  <OutlineItem 
                    key={index}
                    node={node} 
                    depth={0} 
                    onJump={onJump} 
                  />
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '40px 16px', fontSize: '13px', lineHeight: '1.6' }}>
                No Table of Contents available in this document. Use the Thumbnails tab above to view pages.
              </div>
            )
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {Array.from({ length: numPages }, (_, index) => (
                <ThumbnailItem 
                  key={index}
                  pageNumber={index + 1}
                  onJump={onJump} 
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
