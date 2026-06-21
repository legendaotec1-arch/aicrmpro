import { useLocation, useNavigate } from 'react-router-dom';
import { scrollToSection } from '../../lib/scrollToSection';

export default function ScrollToSectionLink({ sectionId, className, children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleClick = (e) => {
    e.preventDefault();
    if (location.pathname === '/') {
      scrollToSection(sectionId);
      return;
    }
    navigate('/', { state: { scrollTo: sectionId }, replace: false });
  };

  return (
    <a href={`/#${sectionId}`} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
