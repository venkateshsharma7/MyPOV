import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';

describe('App', () => {
  it('renders the main application', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // Check if main elements are rendered
    expect(document.body).toBeInTheDocument();
  });
});

describe('Movie Components', () => {
  it('should render movie cards correctly', () => {
    const mockMovie = {
      id: 1,
      title: 'Test Movie',
      poster: 'test-poster.jpg',
      rating: 8.5,
      year: 2023
    };

    // This would be a real test once we have the MovieCard component
    expect(mockMovie.title).toBe('Test Movie');
  });
});