// @vitest-environment jsdom
import { vi, describe, it, expect, beforeAll } from 'vitest';
import { render, fireEvent } from '@testing-library/preact';
import { WorkspaceSidebar } from './WorkspaceSidebar';

// Mock react-pdf Page component
vi.mock('react-pdf', () => ({
  Page: ({ pageNumber }: any) => <div className="mock-pdf-page-thumbnail" data-testid={`mock-thumb-page-${pageNumber}`} />
}));

beforeAll(() => {
  global.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
    observe: vi.fn((el) => {
      callback([{ isIntersecting: true, target: el }]);
    }),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }));
});

describe('WorkspaceSidebar Component', () => {
  const mockOutline = [
    {
      title: 'Chapter 1: Introduction',
      pageNumber: 5,
      items: [
        {
          title: '1.1 Background Study',
          pageNumber: 6
        }
      ]
    },
    {
      title: 'Chapter 2: Core Concepts',
      pageNumber: null,
      items: [
        {
          title: '2.1 Algorithms',
          pageNumber: 12
        }
      ]
    }
  ];

  it('should render outline chapters recursively by default', () => {
    const onJumpSpy = vi.fn();
    const onTabChangeSpy = vi.fn();
    
    const { getByText, queryByTestId } = render(
      <WorkspaceSidebar
        isOpen={true}
        onClose={() => {}}
        tab="outline"
        onTabChange={onTabChangeSpy}
        outline={mockOutline}
        numPages={20}
        onJump={onJumpSpy}
      />
    );

    // Verify main header
    expect(getByText('Table of Contents')).toBeTruthy();

    // Verify top-level chapters and nested nodes
    expect(getByText('Chapter 1: Introduction')).toBeTruthy();
    expect(getByText('1.1 Background Study')).toBeTruthy();
    expect(getByText('Chapter 2: Core Concepts')).toBeTruthy();
    expect(getByText('2.1 Algorithms')).toBeTruthy();

    // Verify that PDF thumbnail pages are not rendered in outline view
    expect(queryByTestId('mock-thumb-page-1')).toBeNull();
  });

  it('should render thumbnails of PDF pages when thumbnails tab is active', () => {
    const onJumpSpy = vi.fn();
    
    const { getByText, getByTestId, queryByText } = render(
      <WorkspaceSidebar
        isOpen={true}
        onClose={() => {}}
        tab="thumbnails"
        onTabChange={() => {}}
        outline={mockOutline}
        numPages={3}
        onJump={onJumpSpy}
      />
    );

    // Verify main header
    expect(getByText('Page Thumbnails')).toBeTruthy();

    // Verify thumbnails render for each page
    expect(getByTestId('mock-thumb-page-1')).toBeTruthy();
    expect(getByTestId('mock-thumb-page-2')).toBeTruthy();
    expect(getByTestId('mock-thumb-page-3')).toBeTruthy();

    // Verify outline chapters are not rendered in thumbnail view
    expect(queryByText('Chapter 1: Introduction')).toBeNull();
  });

  it('should trigger onJump when outline chapter or page thumbnail is clicked', () => {
    const onJumpSpy = vi.fn();
    
    // Test Outline Click
    const outlineResult = render(
      <WorkspaceSidebar
        isOpen={true}
        onClose={() => {}}
        tab="outline"
        onTabChange={() => {}}
        outline={mockOutline}
        numPages={20}
        onJump={onJumpSpy}
      />
    );

    const chapterLink = outlineResult.getByText('Chapter 1: Introduction');
    fireEvent.click(chapterLink);
    expect(onJumpSpy).toHaveBeenCalledWith(5);

    // Test Thumbnail Click
    const thumbnailResult = render(
      <WorkspaceSidebar
        isOpen={true}
        onClose={() => {}}
        tab="thumbnails"
        onTabChange={() => {}}
        outline={mockOutline}
        numPages={20}
        onJump={onJumpSpy}
      />
    );

    const thumbnailPage = thumbnailResult.getByTestId('mock-thumb-page-10');
    fireEvent.click(thumbnailPage);
    expect(onJumpSpy).toHaveBeenCalledWith(10);
  });

  it('should trigger onClose when close button is clicked', () => {
    const onCloseSpy = vi.fn();
    const { getByText } = render(
      <WorkspaceSidebar
        isOpen={true}
        onClose={onCloseSpy}
        tab="outline"
        onTabChange={() => {}}
        outline={[]}
        numPages={20}
        onJump={() => {}}
      />
    );

    const closeBtn = getByText('✕');
    fireEvent.click(closeBtn);
    expect(onCloseSpy).toHaveBeenCalled();
  });
});
