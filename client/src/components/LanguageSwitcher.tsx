import { useLanguage } from '@/hooks/use-language';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  
  const handleLanguageChange = () => {
    setLanguage(language === 'en' ? 'vi' : 'en');
  };

  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-gray-400" />
      <div className="flex items-center space-x-2">
        <Label htmlFor="language-mode" className="text-xs text-gray-400">
          {language === 'en' ? 'EN' : 'VI'}
        </Label>
        <Switch
          id="language-mode"
          checked={language === 'vi'}
          onCheckedChange={handleLanguageChange}
        />
      </div>
    </div>
  );
}