import { Link } from 'wouter';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-neutral-gray py-6">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <svg className="w-6 h-6 text-teal-primary" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path d="M13.92 3.845a1 1 0 10-1.84-.77l-1.2 2.86-3.02-1.51a1 1 0 00-1.38 1.37l1.56 3.12-2.58 1.29a1 1 0 00-.17 1.7l2.36 2.36a4 4 0 105.66-5.66l-2.38-2.38 2.55-1.29a1 1 0 00.44-1.18zM10.5 16a2 2 0 110-4 2 2 0 010 4z"/>
            </svg>
            <span className="ml-2 text-teal-primary font-medium">Dinner, Decided</span>
          </div>
          <div className="flex space-x-6">
            <Link href="/">
              <a className="text-neutral-text hover:text-teal-primary">Help</a>
            </Link>
            <Link href="/">
              <a className="text-neutral-text hover:text-teal-primary">Privacy</a>
            </Link>
            <Link href="/">
              <a className="text-neutral-text hover:text-teal-primary">Terms</a>
            </Link>
            <Link href="/">
              <a className="text-neutral-text hover:text-teal-primary">Contact</a>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
