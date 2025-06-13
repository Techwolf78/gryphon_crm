import { FaFacebookF, FaGoogle, FaInstagram, FaLinkedin } from 'react-icons/fa';

const Footer = () => {
  // Add your actual profile URLs here
  const socialLinks = [
    { icon: FaFacebookF, link: 'https://www.facebook.com/gryphonnacademy' },
    { icon: FaLinkedin, link: 'https://www.linkedin.com/company/gryphonacademy/ ' },
    { icon: FaGoogle, link: 'https://gryphonacademy.co.in/' },
    { icon: FaInstagram, link: 'https://www.instagram.com/gryphon_academy/' },
  ];

  return (
    <footer className="bg-[#1C398E] text-white py-4 px-8 z-50">
      <div className="w-full flex justify-between items-center">
        {/* Left Side: Copyright */}
        <div className="text-sm">
          &copy; {new Date().getFullYear()} Copyright{' '}
          <span className="font-semibold  text-white">
            Gryphon Academy
          </span>
        </div>

        {/* Right Side: Social Icons */}
        <div className="flex space-x-4">
          {socialLinks.map((item, idx) => {
            const Icon = item.icon;
            return (
              <a
                key={idx}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-white text-white rounded-full w-9 h-9 flex items-center justify-center hover:bg-white hover:text-[#1C398E] transition"
              >
                <Icon size={14} />
              </a>
            );
          })}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
