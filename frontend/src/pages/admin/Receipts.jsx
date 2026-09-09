import { useEffect, useState } from 'react';
import { PageHeader } from '../../components/ui/Card.jsx';
import ReceiptListView from '../../components/receipt/ReceiptListView.jsx';
import { userOptions } from '../../services/users.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

export function AdminReceipts() {
  useDocumentTitle('All receipts');
  const [staff, setStaff] = useState([]);

  useEffect(() => {
    let active = true;
    userOptions()
      .then((list) => active && setStaff(list))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <PageHeader
        title="All receipts"
        subtitle="Every receipt issued by the department, including cancelled ones."
      />
      <ReceiptListView basePath="/admin/receipts" showCreator staffOptions={staff} />
    </div>
  );
}

export default AdminReceipts;
