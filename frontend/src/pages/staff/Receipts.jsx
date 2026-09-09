import { Link } from 'react-router-dom';
import { FilePlus2 } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import { PageHeader } from '../../components/ui/Card.jsx';
import ReceiptListView from '../../components/receipt/ReceiptListView.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

export function StaffReceipts() {
  useDocumentTitle('My receipts');

  return (
    <div>
      <PageHeader
        title="My receipts"
        subtitle="Every receipt you have issued. Search by serial number, patient or referring doctor."
        actions={
          <Link to="/staff/receipts/create">
            <Button icon={FilePlus2}>New receipt</Button>
          </Link>
        }
      />
      <ReceiptListView basePath="/staff/receipts" />
    </div>
  );
}

export default StaffReceipts;
