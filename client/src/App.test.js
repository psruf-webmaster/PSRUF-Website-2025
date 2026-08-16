import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the redesigned home hero', () => {
  render(<App />);
  const heroHeading = screen.getByRole('heading', { name: /empowering women in engineering/i });
  expect(heroHeading).toBeInTheDocument();
});
