import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  Download,
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileSpreadsheet,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Users,
  Building2,
  X,
  CreditCard,
  Copy,
  Check,
} from 'lucide-react';
import { ExecutiveLayout } from './ExecutiveLayout';
import { CustomSelect } from '@/components/common/CustomSelect';
import { FloatingAlert } from '@/components/common/FloatingAlert';
import {
  fetchAllLedgerRecords,
  createLedgerRecord,
  updateLedgerRecord,
  deleteLedgerRecord,
  calculateCashBalanceTimeline,
  checkAndAutoResolveDeposit,
  exportLedgerToCSV,
  formatDDMMYYYY,
  parseLedgerDate,
  type LedgerRecord,
} from '@/services/ledgerService';
import {
  fetchAllPaymentBills,
  createPaymentBill,
  updatePaymentBill,
  deletePaymentBill,
  resolveOutstandingFee,
  revokeCompletedPayment,
  slugifyPaymentName,
  type PaymentBill,
} from '@/services/paymentsService';
import { fetchAllUsers, type UserDirectoryEntry } from '@/services/userService';
import { fetchAllOrganizations, type OrganizationDoc } from '@/services/organizationService';

type FinanceTab = 'ledger' | 'outstanding' | 'payments';
type TimeframeOption = 'month' | '6months' | 'ytd' | 'all';
type LedgerSortColumn =
  | 'recipient'
  | 'sender'
  | 'email'
  | 'method'
  | 'deposit'
  | 'withdrawal'
  | 'date';
type SortDirection = 'asc' | 'desc';

interface OutstandingFeeItem {
  id: string; // unique key
  billId: string;
  billName: string;
  payerName: string;
  payerEmail: string;
  payerIdentifier: string; // raw email or org slug
  isInstitution: boolean;
  amountOwed: number;
  amountFormatted: string;
  deadline?: string | null;
  status: 'incomplete' | 'completed';
}

export const ExecutiveFinance: React.FC = () => {
  const [activeTab, setActiveTab] = useState<FinanceTab>('ledger');
  const [loading, setLoading] = useState(true);

  // Data Collections
  const [ledgerRecords, setLedgerRecords] = useState<LedgerRecord[]>([]);
  const [paymentBills, setPaymentBills] = useState<PaymentBill[]>([]);
  const [users, setUsers] = useState<UserDirectoryEntry[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationDoc[]>([]);

  // Notifications
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // =========================================================================
  // TAB 1: LEDGER STATE
  // =========================================================================
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [filterFlow, setFilterFlow] = useState<'all' | 'deposits' | 'withdrawals'>('all');
  const [timeframe, setTimeframe] = useState<TimeframeOption>('all');
  const [sortColumn, setSortColumn] = useState<LedgerSortColumn>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Ledger Modals
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [editingLedgerRecord, setEditingLedgerRecord] = useState<LedgerRecord | null>(null);
  const [ledgerTxType, setLedgerTxType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [txRecipient, setTxRecipient] = useState('UCDS');
  const [txSender, setTxSender] = useState('');
  const [txEmail, setTxEmail] = useState('');
  const [txMethod, setTxMethod] = useState<string>('E-transfer');
  const [txAmount, setTxAmount] = useState('');
  const [txDetails, setTxDetails] = useState('');
  const [txDate, setTxDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isSavingLedger, setIsSavingLedger] = useState(false);

  // Ledger Delete Modal
  const [isDeleteLedgerOpen, setIsDeleteLedgerOpen] = useState(false);
  const [ledgerToDelete, setLedgerToDelete] = useState<LedgerRecord | null>(null);

  // Google Sheets Sync Modal
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  // =========================================================================
  // TAB 2: OUTSTANDING FEES STATE
  // =========================================================================
  const [outstandingSubView, setOutstandingSubView] = useState<'pending' | 'completed'>('pending');
  const [outstandingSearch, setOutstandingSearch] = useState('');
  const [isResolvingId, setIsResolvingId] = useState<string | null>(null);

  // =========================================================================
  // TAB 3: PAYMENTS CATALOG STATE
  // =========================================================================
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingPaymentBill, setEditingPaymentBill] = useState<PaymentBill | null>(null);
  const [billName, setBillName] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billCategory, setBillCategory] = useState('Society Dues');
  const [billAllowedPayments, setBillAllowedPayments] = useState<string[]>([
    'etransfer',
    'paypal',
    'stripe',
  ]);
  const [billDescription, setBillDescription] = useState('');
  const [billTimeOpen, setBillTimeOpen] = useState('');
  const [billTimeDeadline, setBillTimeDeadline] = useState('');
  const [billIncompleteUsers, setBillIncompleteUsers] = useState<string[]>([]);
  const [billIncompleteInst, setBillIncompleteInst] = useState<string[]>([]);
  const [externalEmailInput, setExternalEmailInput] = useState('');
  const [isSavingBill, setIsSavingBill] = useState(false);

  // Delete Payment Modal
  const [isDeleteBillOpen, setIsDeleteBillOpen] = useState(false);
  const [billToDelete, setBillToDelete] = useState<PaymentBill | null>(null);

  // =========================================================================
  // DATA LOADING
  // =========================================================================
  const loadAllData = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const [ledgerData, paymentsData, usersData, orgsData] = await Promise.all([
        fetchAllLedgerRecords(force),
        fetchAllPaymentBills(force),
        fetchAllUsers(force),
        fetchAllOrganizations(force),
      ]);

      setLedgerRecords(ledgerData);
      setPaymentBills(paymentsData);
      setUsers(usersData);
      setOrganizations(orgsData);
    } catch (err: unknown) {
      console.error('Failed to load financial records:', err);
      const msg = err instanceof Error ? err.message : 'Failed to load financial data.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Lock background scroll when any modal is open
  useEffect(() => {
    const isAnyModalOpen =
      isLedgerModalOpen ||
      isDeleteLedgerOpen ||
      isSheetsModalOpen ||
      isPaymentModalOpen ||
      isDeleteBillOpen;

    if (isAnyModalOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [
    isLedgerModalOpen,
    isDeleteLedgerOpen,
    isSheetsModalOpen,
    isPaymentModalOpen,
    isDeleteBillOpen,
  ]);

  // =========================================================================
  // METRICS & TIMELINE GRAPH CALCULATIONS
  // =========================================================================
  const { currentBalance, totalDeposits, totalWithdrawals, timeline, yAxisMax, yAxisTicks } =
    useMemo(() => {
      return calculateCashBalanceTimeline(ledgerRecords, timeframe);
    }, [ledgerRecords, timeframe]);

  // Total unpaid fees owed across all active payment bills
  const totalUnpaidFees = useMemo(() => {
    return paymentBills.reduce((acc, bill) => {
      const unpaidCount = (bill.incomplete?.length || 0) + (bill['incomplete-institution']?.length || 0);
      return acc + (bill.amount || 0) * unpaidCount;
    }, 0);
  }, [paymentBills]);

  const totalUnpaidCount = useMemo(() => {
    return paymentBills.reduce((acc, bill) => {
      return acc + (bill.incomplete?.length || 0) + (bill['incomplete-institution']?.length || 0);
    }, 0);
  }, [paymentBills]);

  // =========================================================================
  // TAB 1: LEDGER SORTING & FILTERING
  // =========================================================================
  const handleSort = (col: LedgerSortColumn) => {
    if (sortColumn === col) {
      // Toggle direction
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(col);
      // For amounts and dates, default to desc on first click; for text, asc
      setSortDirection(col === 'date' || col === 'deposit' || col === 'withdrawal' ? 'desc' : 'asc');
    }
  };

  const filteredLedgerRecords = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return ledgerRecords
      .filter((r) => {
        // Flow filter
        if (filterFlow === 'deposits' && (typeof r.amount !== 'number' || r.amount <= 0)) return false;
        if (filterFlow === 'withdrawals' && (typeof r.withdrawl !== 'number' || r.withdrawl <= 0))
          return false;

        // Channel filter
        if (filterMethod !== 'all' && !r.method.toLowerCase().includes(filterMethod.toLowerCase())) {
          return false;
        }

        // Text search
        if (!q) return true;
        const recipient = (r.recipient || '').toLowerCase();
        const sender = (r.sender || '').toLowerCase();
        const email = (r.email || '').toLowerCase();
        const details = (r.details || '').toLowerCase();
        const method = (r.method || '').toLowerCase();

        return (
          recipient.includes(q) ||
          sender.includes(q) ||
          email.includes(q) ||
          details.includes(q) ||
          method.includes(q)
        );
      })
      .sort((a, b) => {
        let cmp = 0;
        switch (sortColumn) {
          case 'recipient':
            cmp = (a.recipient || '').localeCompare(b.recipient || '');
            break;
          case 'sender':
            cmp = (a.sender || '').localeCompare(b.sender || '');
            break;
          case 'email':
            cmp = (a.email || '').localeCompare(b.email || '');
            break;
          case 'method':
            cmp = (a.method || '').localeCompare(b.method || '');
            break;
          case 'deposit': {
            const depA = typeof a.amount === 'number' ? a.amount : -1;
            const depB = typeof b.amount === 'number' ? b.amount : -1;
            cmp = depA - depB;
            break;
          }
          case 'withdrawal': {
            const withA = typeof a.withdrawl === 'number' ? a.withdrawl : -1;
            const withB = typeof b.withdrawl === 'number' ? b.withdrawl : -1;
            cmp = withA - withB;
            break;
          }
          case 'date':
          default: {
            const timeA = parseLedgerDate(a['time-created']).getTime();
            const timeB = parseLedgerDate(b['time-created']).getTime();
            cmp = timeA - timeB;
            break;
          }
        }
        return sortDirection === 'asc' ? cmp : -cmp;
      });
  }, [ledgerRecords, searchQuery, filterMethod, filterFlow, sortColumn, sortDirection]);

  // Open New Transaction Modal
  const handleOpenNewLedgerModal = (defaultType: 'deposit' | 'withdrawal' = 'deposit') => {
    setEditingLedgerRecord(null);
    setLedgerTxType(defaultType);
    setTxRecipient(defaultType === 'deposit' ? 'UCDS' : '');
    setTxSender(defaultType === 'withdrawal' ? 'UCDS' : '');
    setTxEmail('');
    setTxMethod('E-transfer');
    setTxAmount('');
    setTxDetails('');
    setTxDate(new Date().toISOString().split('T')[0]);
    setIsLedgerModalOpen(true);
  };

  // Open Edit Transaction Modal
  const handleOpenEditLedgerModal = (record: LedgerRecord) => {
    setEditingLedgerRecord(record);
    const isDeposit = typeof record.amount === 'number' && record.amount > 0;
    setLedgerTxType(isDeposit ? 'deposit' : 'withdrawal');
    setTxRecipient(record.recipient || '');
    setTxSender(record.sender || '');
    setTxEmail(record.email || '');
    setTxMethod(record.method || 'E-transfer');
    setTxAmount(
      isDeposit ? String(record.amount || '') : String(record.withdrawl || '')
    );
    setTxDetails(record.details || '');
    const d = parseLedgerDate(record['time-created']);
    setTxDate(d.toISOString().split('T')[0]);
    setIsLedgerModalOpen(true);
  };

  // Save Transaction (Deposit or Withdrawal)
  const handleSaveLedgerRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmt = parseFloat(txAmount);
    if (isNaN(parsedAmt) || parsedAmt <= 0) {
      setError('Please enter a valid amount greater than zero.');
      return;
    }
    if (!txRecipient.trim()) {
      setError('Recipient name is required.');
      return;
    }
    if (!txSender.trim()) {
      setError('Sender name is required.');
      return;
    }

    setIsSavingLedger(true);
    try {
      const isDeposit = ledgerTxType === 'deposit';

      if (editingLedgerRecord) {
        await updateLedgerRecord(editingLedgerRecord.id, {
          recipient: txRecipient.trim(),
          sender: txSender.trim(),
          email: txEmail.trim(),
          method: txMethod,
          amount: isDeposit ? parsedAmt : undefined,
          withdrawl: !isDeposit ? parsedAmt : undefined,
          details: txDetails.trim(),
          timeCreated: new Date(txDate),
        });
        setSuccess('Transaction updated successfully in Ledger.');
      } else {
        await createLedgerRecord({
          recipient: txRecipient.trim(),
          sender: txSender.trim(),
          email: txEmail.trim(),
          method: txMethod,
          amount: isDeposit ? parsedAmt : undefined,
          withdrawl: !isDeposit ? parsedAmt : undefined,
          details: txDetails.trim(),
          timeCreated: new Date(txDate),
        });

        // Inter-sheet Linking: If deposit, check and auto-resolve outstanding payment
        if (isDeposit) {
          const autoRes = await checkAndAutoResolveDeposit({
            amount: parsedAmt,
            email: txEmail.trim(),
            sender: txSender.trim(),
          });

          if (autoRes?.resolved) {
            setSuccess(
              `Transaction logged! Outstanding payment "${autoRes.paymentName}" was automatically marked as resolved for ${autoRes.payer}.`
            );
          } else {
            setSuccess('Deposit transaction logged successfully in society Ledger.');
          }
        } else {
          setSuccess('Withdrawal transaction logged successfully in society Ledger.');
        }
      }

      setIsLedgerModalOpen(false);
      loadAllData(true);
    } catch (err: unknown) {
      console.error('Failed to save ledger record:', err);
      const msg = err instanceof Error ? err.message : 'Failed to save ledger record.';
      setError(msg);
    } finally {
      setIsSavingLedger(false);
    }
  };

  // Delete Transaction
  const handleConfirmDeleteLedger = async () => {
    if (!ledgerToDelete) return;
    try {
      await deleteLedgerRecord(ledgerToDelete.id);
      setSuccess('Transaction removed from society Ledger.');
      setIsDeleteLedgerOpen(false);
      setLedgerToDelete(null);
      loadAllData(true);
    } catch (err: unknown) {
      console.error('Failed to delete ledger record:', err);
      const msg = err instanceof Error ? err.message : 'Failed to delete ledger record.';
      setError(msg);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const csvContent = exportLedgerToCSV(filteredLedgerRecords);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `ucds_financial_ledger_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setSuccess('Exported society ledger CSV with 9 official columns.');
  };

  // =========================================================================
  // TAB 2: OUTSTANDING FEES RESOLUTION & MAPPING
  // =========================================================================
  const allOutstandingItems = useMemo<OutstandingFeeItem[]>(() => {
    const items: OutstandingFeeItem[] = [];

    // Helper map of users by lowercase emails
    const userEmailMap = new Map<string, UserDirectoryEntry>();
    users.forEach((u) => {
      if (u['email-login']) userEmailMap.set(u['email-login'].toLowerCase().trim(), u);
      if (u['email-preferred']) userEmailMap.set(u['email-preferred'].toLowerCase().trim(), u);
      if (u['email-ucalgary']) userEmailMap.set(u['email-ucalgary'].toLowerCase().trim(), u);
    });

    // Helper map of organizations by slug and email
    const orgMap = new Map<string, OrganizationDoc>();
    organizations.forEach((org) => {
      orgMap.set(org.id.toLowerCase().trim(), org);
      if (org.email) orgMap.set(org.email.toLowerCase().trim(), org);
      if (org['email-finance']) orgMap.set(org['email-finance'].toLowerCase().trim(), org);
    });

    paymentBills.forEach((bill) => {
      // 1. Incomplete Users
      (bill.incomplete || []).forEach((em) => {
        const cleanEmail = em.toLowerCase().trim();
        const matchedUser = userEmailMap.get(cleanEmail);
        const matchedOrg = orgMap.get(cleanEmail);

        // Rule: "Display the name of the person or organization. fetch from firestore in Users and Organizations. If there is none associated, skip and don't display anything."
        if (!matchedUser && !matchedOrg) {
          return;
        }

        const payerName = matchedUser
          ? `${matchedUser['name-first'] || ''} ${matchedUser['name-last'] || ''}`.trim() ||
            `@${matchedUser.username}`
          : matchedOrg?.name || cleanEmail;

        items.push({
          id: `${bill.id}_user_${cleanEmail}`,
          billId: bill.id,
          billName: bill.name,
          payerName,
          payerEmail: cleanEmail,
          payerIdentifier: cleanEmail,
          isInstitution: false,
          amountOwed: bill.amount,
          amountFormatted: bill.amountFormatted || `$${bill.amount.toFixed(2)} CAD`,
          deadline: bill['time-deadline'],
          status: 'incomplete',
        });
      });

      // 2. Incomplete Institutions
      (bill['incomplete-institution'] || []).forEach((inst) => {
        const cleanInst = inst.trim();
        const matchedOrg = orgMap.get(cleanInst.toLowerCase());

        if (!matchedOrg) {
          return;
        }

        items.push({
          id: `${bill.id}_inst_${cleanInst}`,
          billId: bill.id,
          billName: bill.name,
          payerName: matchedOrg.name,
          payerEmail: matchedOrg['email-finance'] || matchedOrg.email || cleanInst,
          payerIdentifier: cleanInst,
          isInstitution: true,
          amountOwed: bill.amount,
          amountFormatted: bill.amountFormatted || `$${bill.amount.toFixed(2)} CAD`,
          deadline: bill['time-deadline'],
          status: 'incomplete',
        });
      });

      // 3. Completed Users
      (bill.completed || []).forEach((em) => {
        const cleanEmail = em.toLowerCase().trim();
        const matchedUser = userEmailMap.get(cleanEmail);
        const matchedOrg = orgMap.get(cleanEmail);

        if (!matchedUser && !matchedOrg) return;

        const payerName = matchedUser
          ? `${matchedUser['name-first'] || ''} ${matchedUser['name-last'] || ''}`.trim() ||
            `@${matchedUser.username}`
          : matchedOrg?.name || cleanEmail;

        items.push({
          id: `${bill.id}_user_comp_${cleanEmail}`,
          billId: bill.id,
          billName: bill.name,
          payerName,
          payerEmail: cleanEmail,
          payerIdentifier: cleanEmail,
          isInstitution: false,
          amountOwed: bill.amount,
          amountFormatted: bill.amountFormatted || `$${bill.amount.toFixed(2)} CAD`,
          deadline: bill['time-deadline'],
          status: 'completed',
        });
      });

      // 4. Completed Institutions
      (bill['completed-institution'] || []).forEach((inst) => {
        const cleanInst = inst.trim();
        const matchedOrg = orgMap.get(cleanInst.toLowerCase());

        if (!matchedOrg) return;

        items.push({
          id: `${bill.id}_inst_comp_${cleanInst}`,
          billId: bill.id,
          billName: bill.name,
          payerName: matchedOrg.name,
          payerEmail: matchedOrg['email-finance'] || matchedOrg.email || cleanInst,
          payerIdentifier: cleanInst,
          isInstitution: true,
          amountOwed: bill.amount,
          amountFormatted: bill.amountFormatted || `$${bill.amount.toFixed(2)} CAD`,
          deadline: bill['time-deadline'],
          status: 'completed',
        });
      });
    });

    return items;
  }, [paymentBills, users, organizations]);

  const filteredOutstandingItems = useMemo(() => {
    const q = outstandingSearch.toLowerCase().trim();
    return allOutstandingItems.filter((item) => {
      if (item.status !== (outstandingSubView === 'pending' ? 'incomplete' : 'completed')) {
        return false;
      }
      if (!q) return true;
      return (
        item.payerName.toLowerCase().includes(q) ||
        item.payerEmail.toLowerCase().includes(q) ||
        item.billName.toLowerCase().includes(q)
      );
    });
  }, [allOutstandingItems, outstandingSubView, outstandingSearch]);

  // Resolve Fee
  const handleResolveFee = async (item: OutstandingFeeItem) => {
    setIsResolvingId(item.id);
    try {
      await resolveOutstandingFee(item.billId, item.payerIdentifier, item.isInstitution);
      setSuccess(
        `Resolved payment for ${item.payerName} (${item.billName}). Moved to completed.`
      );
      loadAllData(true);
    } catch (err: unknown) {
      console.error('Failed to resolve fee:', err);
      const msg = err instanceof Error ? err.message : 'Failed to resolve fee.';
      setError(msg);
    } finally {
      setIsResolvingId(null);
    }
  };

  // Revoke Payment
  const handleRevokePayment = async (item: OutstandingFeeItem) => {
    setIsResolvingId(item.id);
    try {
      await revokeCompletedPayment(item.billId, item.payerIdentifier, item.isInstitution);
      setSuccess(
        `Revoked payment for ${item.payerName}. Returned to incomplete list.`
      );
      loadAllData(true);
    } catch (err: unknown) {
      console.error('Failed to revoke payment:', err);
      const msg = err instanceof Error ? err.message : 'Failed to revoke payment.';
      setError(msg);
    } finally {
      setIsResolvingId(null);
    }
  };

  // =========================================================================
  // TAB 3: PAYMENTS CATALOG MANAGEMENT
  // =========================================================================
  const handleOpenCreatePaymentModal = () => {
    setEditingPaymentBill(null);
    setBillName('');
    setBillAmount('25.00');
    setBillCategory('Society Dues');
    setBillAllowedPayments(['etransfer', 'paypal', 'stripe']);
    setBillDescription('');
    setBillTimeOpen('');
    setBillTimeDeadline('');
    setBillIncompleteUsers([]);
    setBillIncompleteInst([]);
    setExternalEmailInput('');
    setIsPaymentModalOpen(true);
  };

  const handleOpenEditPaymentModal = (bill: PaymentBill) => {
    setEditingPaymentBill(bill);
    setBillName(bill.name || '');
    setBillAmount(String(bill.amount || '0'));
    setBillCategory(bill.category || 'Society Dues');
    setBillAllowedPayments(bill['allowed-payments'] || ['etransfer', 'paypal', 'stripe']);
    setBillDescription(bill.description || '');
    setBillTimeOpen(bill['time-open'] ? String(bill['time-open']).split('T')[0] : '');
    setBillTimeDeadline(bill['time-deadline'] ? String(bill['time-deadline']).split('T')[0] : '');
    setBillIncompleteUsers(bill.incomplete || []);
    setBillIncompleteInst(bill['incomplete-institution'] || []);
    setExternalEmailInput('');
    setIsPaymentModalOpen(true);
  };

  const handleToggleAllowedPayment = (method: string) => {
    setBillAllowedPayments((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
    );
  };

  const handleAddExternalEmails = () => {
    const raw = externalEmailInput.trim();
    if (!raw) return;
    const split = raw
      .split(/[\s,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes('@'));

    const newUsers = Array.from(new Set([...billIncompleteUsers, ...split]));
    setBillIncompleteUsers(newUsers);
    setExternalEmailInput('');
  };

  const handleRemoveIncompleteUser = (email: string) => {
    setBillIncompleteUsers((prev) => prev.filter((e) => e !== email));
  };

  const handleToggleIncompleteOrg = (orgId: string) => {
    setBillIncompleteInst((prev) =>
      prev.includes(orgId) ? prev.filter((id) => id !== orgId) : [...prev, orgId]
    );
  };

  const handleSavePaymentBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billName.trim()) {
      setError('Payment name is required.');
      return;
    }
    const amt = parseFloat(billAmount);
    if (isNaN(amt) || amt < 0) {
      setError('Please enter a valid amount.');
      return;
    }

    setIsSavingBill(true);
    try {
      if (editingPaymentBill) {
        await updatePaymentBill(editingPaymentBill.id, {
          name: billName.trim(),
          amount: amt,
          category: billCategory.trim(),
          'allowed-payments': billAllowedPayments,
          description: billDescription.trim(),
          'time-open': billTimeOpen ? new Date(billTimeOpen).toISOString() : null,
          'time-deadline': billTimeDeadline ? new Date(billTimeDeadline).toISOString() : null,
          incomplete: billIncompleteUsers,
          'incomplete-institution': billIncompleteInst,
        });
        setSuccess(`Payment "${billName}" updated successfully!`);
      } else {
        const newSlug = slugifyPaymentName(billName);
        await createPaymentBill(
          {
            name: billName.trim(),
            amount: amt,
            category: billCategory.trim(),
            'allowed-payments': billAllowedPayments,
            description: billDescription.trim(),
            'time-open': billTimeOpen ? new Date(billTimeOpen).toISOString() : null,
            'time-deadline': billTimeDeadline ? new Date(billTimeDeadline).toISOString() : null,
            incomplete: billIncompleteUsers,
            'incomplete-institution': billIncompleteInst,
          },
          newSlug
        );
        setSuccess(`Created payment bill "${billName}" (ID: ${newSlug})!`);
      }

      setIsPaymentModalOpen(false);
      loadAllData(true);
    } catch (err: unknown) {
      console.error('Failed to save payment bill:', err);
      const msg = err instanceof Error ? err.message : 'Failed to save payment bill.';
      setError(msg);
    } finally {
      setIsSavingBill(false);
    }
  };

  const handleConfirmDeleteBill = async () => {
    if (!billToDelete) return;
    try {
      await deletePaymentBill(billToDelete.id);
      setSuccess(`Deleted payment "${billToDelete.name}".`);
      setIsDeleteBillOpen(false);
      setBillToDelete(null);
      loadAllData(true);
    } catch (err: unknown) {
      console.error('Failed to delete payment bill:', err);
      const msg = err instanceof Error ? err.message : 'Failed to delete payment bill.';
      setError(msg);
    }
  };

  // Copy Google Apps Script text
  const handleCopyAppsScript = () => {
    const scriptSnippet = `// UCDS Google Apps Script - Please see scripts/googleAppsScript_LedgerSync.js in repository for full setup.`;
    navigator.clipboard.writeText(scriptSnippet);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  return (
    <ExecutiveLayout activeSection="finance">
      {/* Floating Notifications */}
      <FloatingAlert
        message={error}
        type="error"
        onDismiss={() => setError(null)}
        duration={6000}
      />
      <FloatingAlert
        message={success}
        type="success"
        onDismiss={() => setSuccess(null)}
        duration={6000}
      />

      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black font-sans text-[#1C244C] dark:text-[#F6F6F6] tracking-tight">
              Society Financial Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 font-medium">
              Real-time operating ledger, outstanding fees resolution, and payment item administration.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => loadAllData(true)}
              className="p-2 rounded-xl border border-slate-300/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-[#0075A2] dark:hover:text-[#53afd0] transition shadow-sm cursor-pointer"
              title="Refresh all financial data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0075A2]' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => setIsSheetsModalOpen(true)}
              className="btn-exec-return flex items-center gap-1.5 text-xs font-bold"
              title="Google Sheets 2-way synchronization"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Google Sheet Sync</span>
            </button>

            {activeTab === 'ledger' && (
              <button
                type="button"
                onClick={() => handleOpenNewLedgerModal('deposit')}
                className="btn-exec-primary text-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Record Transaction</span>
              </button>
            )}

            {activeTab === 'payments' && (
              <button
                type="button"
                onClick={handleOpenCreatePaymentModal}
                className="btn-exec-primary text-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Create Payment</span>
              </button>
            )}
          </div>
        </div>

        {/* 3 Main Tabs Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#1C244C]/5 dark:bg-[#53afd0]/10 border border-[#1C244C]/10 dark:border-[#53afd0]/20 max-w-lg">
          <button
            type="button"
            onClick={() => setActiveTab('ledger')}
            className={`flex-1 py-2 px-3.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'ledger'
                ? 'bg-[#1C244C] text-[#F6F6F6] dark:bg-[#0075A2] shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-[#0075A2] dark:hover:text-[#53afd0]'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Ledger ({ledgerRecords.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('outstanding')}
            className={`flex-1 py-2 px-3.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'outstanding'
                ? 'bg-[#1C244C] text-[#F6F6F6] dark:bg-[#0075A2] shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-[#0075A2] dark:hover:text-[#53afd0]'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Outstanding Fees ({totalUnpaidCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`flex-1 py-2 px-3.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'payments'
                ? 'bg-[#1C244C] text-[#F6F6F6] dark:bg-[#0075A2] shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-[#0075A2] dark:hover:text-[#53afd0]'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Payments ({paymentBills.length})</span>
          </button>
        </div>

        {/* =================================================================== */}
        {/* TAB 1: LEDGER VIEW                                                  */}
        {/* =================================================================== */}
        {activeTab === 'ledger' && (
          <div className="space-y-6 animate-viewFadeIn">
            {/* Top Metrics Cards Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Cash Balance */}
              <div className="exec-card p-4 relative overflow-hidden border-purple-500/20">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                  <span>Current Cash Balance</span>
                  <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black font-sans text-[#1C244C] dark:text-[#F6F6F6]">
                  ${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CAD
                </div>
                <div className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 mt-1">
                  Cumulative Operating Reserves
                </div>
              </div>

              {/* 2. Unpaid Fees (Replaced Tournament Grants & Subsidy) */}
              <div className="exec-card p-4 relative overflow-hidden border-amber-500/20">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                  <span>Unpaid Fees</span>
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black font-sans text-amber-600 dark:text-amber-400">
                  ${totalUnpaidFees.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CAD
                </div>
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1">
                  {totalUnpaidCount} pending individual/club fees
                </div>
              </div>

              {/* 3. Total Deposits */}
              <div className="exec-card p-4 relative overflow-hidden border-emerald-500/20">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                  <span>Total Inbound Deposits</span>
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black font-sans text-emerald-600 dark:text-emerald-400">
                  +${totalDeposits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CAD
                </div>
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1">
                  Dues, grants & entry revenue
                </div>
              </div>

              {/* 4. Total Withdrawals */}
              <div className="exec-card p-4 relative overflow-hidden border-rose-500/20">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                  <span>Total Withdrawals</span>
                  <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black font-sans text-rose-600 dark:text-rose-400">
                  -${totalWithdrawals.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CAD
                </div>
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1">
                  Debate society expenditures
                </div>
              </div>
            </div>

            {/* Cash Balance Interactive SVG Visualization */}
            <div className="exec-card p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black font-sans text-[#1C244C] dark:text-[#F6F6F6]">
                    Society Cash Balance Trajectory
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Historical cash progression from earliest transaction to latest balance.
                  </p>
                </div>

                {/* Timeframe Toggles */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold">
                  {(['month', '6months', 'ytd', 'all'] as const).map((tf) => (
                    <button
                      key={tf}
                      type="button"
                      onClick={() => setTimeframe(tf)}
                      className={`py-1 px-2.5 rounded-lg transition cursor-pointer capitalize ${
                        timeframe === tf
                          ? 'bg-[#1C244C] text-white dark:bg-[#0075A2]'
                          : 'text-slate-600 dark:text-slate-300 hover:text-[#0075A2]'
                      }`}
                    >
                      {tf === '6months' ? 'Last 6 Mo' : tf === 'ytd' ? 'YTD' : tf}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visualization Canvas */}
              <div className="w-full h-56 relative pt-4 pb-2">
                {timeline.length > 0 ? (
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 800 200">
                    <defs>
                      <linearGradient id="balanceAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0075A2" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#0075A2" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Y-axis Ticks & Horizontal Guidelines */}
                    {yAxisTicks.map((val) => {
                      const yPos = 180 - (val / (yAxisMax || 1)) * 160;
                      return (
                        <g key={val}>
                          <line
                            x1="45"
                            y1={yPos}
                            x2="790"
                            y2={yPos}
                            stroke="currentColor"
                            strokeOpacity="0.08"
                            strokeDasharray="3 3"
                          />
                          <text
                            x="40"
                            y={yPos + 4}
                            textAnchor="end"
                            className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono font-semibold"
                          >
                            ${val}
                          </text>
                        </g>
                      );
                    })}

                    {/* Area fill and Line */}
                    {(() => {
                      const pts = timeline.map((p, idx) => {
                        const x =
                          timeline.length === 1
                            ? 400
                            : 60 + (idx / (timeline.length - 1)) * 720;
                        const y = 180 - (p.runningBalance / (yAxisMax || 1)) * 160;
                        return { x, y, p };
                      });

                      const pathD = pts.reduce((acc, pt, i) => {
                        return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
                      }, '');

                      const areaD = `${pathD} L ${pts[pts.length - 1].x} 180 L ${pts[0].x} 180 Z`;

                      return (
                        <>
                          <path d={areaD} fill="url(#balanceAreaGrad)" />
                          <path
                            d={pathD}
                            fill="none"
                            stroke="#0075A2"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="dark:stroke-[#53afd0]"
                          />
                          {pts.map((pt, i) => (
                            <g key={i} className="group cursor-pointer">
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r="4.5"
                                className="fill-[#1C244C] dark:fill-[#53afd0] stroke-white dark:stroke-[#15162C] stroke-2 group-hover:r-6 transition-all"
                              />
                              {/* Hover Tooltip */}
                              <title>{`${pt.p.dateStr} — Balance: $${pt.p.runningBalance.toFixed(2)} CAD\n(${pt.p.label})`}</title>
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                    No transactions recorded for this timeframe.
                  </div>
                )}
              </div>
            </div>

            {/* Filter and Action Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 flex-1 max-w-xl">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search recipient, sender, email, details..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="exec-input exec-search-input !pl-10 text-xs"
                  />
                </div>

                {/* Method Filter */}
                <div className="w-44">
                  <CustomSelect
                    value={filterMethod}
                    onChange={(val) => setFilterMethod(val)}
                    options={[
                      { value: 'all', label: 'All Channels' },
                      { value: 'Stripe', label: 'Stripe' },
                      { value: 'PayPal', label: 'PayPal' },
                      { value: 'E-transfer', label: 'E-transfer' },
                      { value: 'Other', label: 'Other' },
                    ]}
                  />
                </div>

                {/* Flow Filter */}
                <div className="w-40">
                  <CustomSelect
                    value={filterFlow}
                    onChange={(val) => setFilterFlow(val as 'all' | 'deposits' | 'withdrawals')}
                    options={[
                      { value: 'all', label: 'All Flows' },
                      { value: 'deposits', label: 'Deposits (Inbound)' },
                      { value: 'withdrawals', label: 'Withdrawals (Out)' },
                    ]}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="btn-exec-return flex items-center gap-1.5 text-xs font-bold"
                  title="Download CSV containing all 8 columns"
                >
                  <Download className="w-4 h-4" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Ledger Table (8 Strict Ordered Columns) */}
            <div className="exec-card p-0 overflow-hidden">
              <div className="exec-table-wrapper">
                <table className="exec-table">
                  <thead>
                    <tr>
                      {/* 1. Recipient */}
                      <th
                        onClick={() => handleSort('recipient')}
                        className="cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800 transition select-none"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Recipient</span>
                          {sortColumn === 'recipient' ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-40" />
                          )}
                        </div>
                      </th>

                      {/* 2. Sender */}
                      <th
                        onClick={() => handleSort('sender')}
                        className="cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800 transition select-none"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Sender</span>
                          {sortColumn === 'sender' ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-40" />
                          )}
                        </div>
                      </th>

                      {/* 3. Email */}
                      <th
                        onClick={() => handleSort('email')}
                        className="cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800 transition select-none"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Email</span>
                          {sortColumn === 'email' ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-40" />
                          )}
                        </div>
                      </th>

                      {/* 5. Method */}
                      <th
                        onClick={() => handleSort('method')}
                        className="cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800 transition select-none text-center"
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span>Method</span>
                          {sortColumn === 'method' ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-40" />
                          )}
                        </div>
                      </th>

                      {/* 6. Deposit ($ CAD) */}
                      <th
                        onClick={() => handleSort('deposit')}
                        className="cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800 transition select-none text-right"
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>Deposit ($ CAD)</span>
                          {sortColumn === 'deposit' ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-40" />
                          )}
                        </div>
                      </th>

                      {/* 7. Withdrawal ($ CAD) */}
                      <th
                        onClick={() => handleSort('withdrawal')}
                        className="cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800 transition select-none text-right"
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>Withdrawal ($ CAD)</span>
                          {sortColumn === 'withdrawal' ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-40" />
                          )}
                        </div>
                      </th>

                      {/* 8. Details (Unsortable) */}
                      <th className="select-none">Details</th>

                      {/* 9. Date (DD/MM/YYYY) */}
                      <th
                        onClick={() => handleSort('date')}
                        className="cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800 transition select-none text-center"
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span>Date (DD/MM/YYYY)</span>
                          {sortColumn === 'date' ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-40" />
                          )}
                        </div>
                      </th>

                      {/* Actions */}
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLedgerRecords.map((r) => {
                      const isDeposit = typeof r.amount === 'number' && r.amount > 0;
                      const isWithdrawal = typeof r.withdrawl === 'number' && r.withdrawl > 0;

                      return (
                        <tr key={r.id}>
                          {/* 1. Recipient */}
                          <td className="font-bold text-xs">{r.recipient}</td>

                          {/* 2. Sender */}
                          <td className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                            {r.sender}
                          </td>

                          {/* 3. Email */}
                          <td className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                            {r.email || '—'}
                          </td>

                          {/* 5. Method */}
                          <td className="text-center">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#1C244C]/5 dark:bg-[#53afd0]/10 text-[#1C244C] dark:text-[#53afd0] border border-[#1C244C]/10 dark:border-[#53afd0]/20">
                              {r.method}
                            </span>
                          </td>

                          {/* 6. Deposit ($ CAD) */}
                          <td className="text-xs font-black font-sans text-right text-emerald-600 dark:text-emerald-400">
                            {isDeposit ? r.amount!.toFixed(2) : '—'}
                          </td>

                          {/* 7. Withdrawal ($ CAD) */}
                          <td className="text-xs font-black font-sans text-right text-rose-600 dark:text-rose-400">
                            {isWithdrawal ? r.withdrawl!.toFixed(2) : '—'}
                          </td>

                          {/* 8. Details */}
                          <td className="text-xs text-slate-600 dark:text-slate-300 max-w-xs truncate" title={r.details}>
                            {r.details || '—'}
                          </td>

                          {/* 9. Date (DD/MM/YYYY) */}
                          <td className="text-xs font-mono font-medium text-center text-slate-500 dark:text-slate-400">
                            {formatDDMMYYYY(r['time-created'])}
                          </td>

                          {/* Actions */}
                          <td className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditLedgerModal(r)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-[#0075A2] dark:hover:text-[#53afd0] transition cursor-pointer"
                                title="Edit entry"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setLedgerToDelete(r);
                                  setIsDeleteLedgerOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                title="Delete entry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredLedgerRecords.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-xs text-slate-400">
                          No ledger records match the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: OUTSTANDING FEES VIEW                                        */}
        {/* =================================================================== */}
        {activeTab === 'outstanding' && (
          <div className="space-y-5 animate-viewFadeIn">
            {/* Header & Subview Selector */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOutstandingSubView('pending')}
                  className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    outstandingSubView === 'pending'
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Unpaid Dues & Fees</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOutstandingSubView('completed')}
                  className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    outstandingSubView === 'completed'
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Completed Payments (History)</span>
                </button>
              </div>

              {/* Search */}
              <div className="relative w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter debater, organization, email..."
                  value={outstandingSearch}
                  onChange={(e) => setOutstandingSearch(e.target.value)}
                  className="exec-input exec-search-input !pl-9 text-xs"
                />
              </div>
            </div>

            {/* Outstanding Fees Table */}
            <div className="exec-card p-0 overflow-hidden">
              <div className="exec-table-wrapper">
                <table className="exec-table">
                  <thead>
                    <tr>
                      <th>Payer (Person / Organization)</th>
                      <th>Email</th>
                      <th>Payment Bill Name</th>
                      <th>Amount Owed</th>
                      <th>Deadline</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOutstandingItems.map((item) => (
                      <tr
                        key={item.id}
                        className={
                          item.status === 'completed'
                            ? 'opacity-65 hover:opacity-100 bg-slate-50/50 dark:bg-slate-900/20'
                            : ''
                        }
                      >
                        {/* Person or Organization Name */}
                        <td>
                          <div className="font-bold text-xs flex items-center gap-1.5">
                            {item.isInstitution ? (
                              <Building2 className="w-3.5 h-3.5 text-[#0075A2] dark:text-[#53afd0]" />
                            ) : (
                              <Users className="w-3.5 h-3.5 text-slate-500" />
                            )}
                            <span>{item.payerName}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {item.isInstitution ? 'Affiliated Institution' : 'Society Debater'}
                          </div>
                        </td>

                        {/* Email */}
                        <td className="text-xs font-mono text-slate-600 dark:text-slate-300">
                          {item.payerEmail}
                        </td>

                        {/* Payment Bill Name */}
                        <td>
                          <span className="font-bold text-xs text-[#1C244C] dark:text-[#F6F6F6]">
                            {item.billName}
                          </span>
                        </td>

                        {/* Amount Owed */}
                        <td className="text-xs font-black font-sans text-[#0075A2] dark:text-[#53afd0]">
                          {item.amountFormatted}
                        </td>

                        {/* Deadline */}
                        <td className="text-xs font-mono text-slate-500 dark:text-slate-400">
                          {item.deadline ? formatDDMMYYYY(item.deadline) : 'No Deadline'}
                        </td>

                        {/* Action: Resolve or Revoke */}
                        <td className="text-right">
                          {item.status === 'incomplete' ? (
                            <button
                              type="button"
                              onClick={() => handleResolveFee(item)}
                              disabled={isResolvingId === item.id}
                              className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{isResolvingId === item.id ? 'Resolving...' : 'Resolve Payment'}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRevokePayment(item)}
                              disabled={isResolvingId === item.id}
                              className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 transition cursor-pointer"
                              title="Revoke and return back to incomplete"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>{isResolvingId === item.id ? 'Revoking...' : 'Revoke'}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}

                    {filteredOutstandingItems.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                          {outstandingSubView === 'pending'
                            ? 'No unpaid fees outstanding. All debater and club accounts in good standing!'
                            : 'No completed payments record in this view.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: PAYMENTS CATALOG VIEW                                        */}
        {/* =================================================================== */}
        {activeTab === 'payments' && (
          <div className="space-y-5 animate-viewFadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paymentBills.map((bill) => {
                const totalIncomplete =
                  (bill.incomplete?.length || 0) + (bill['incomplete-institution']?.length || 0);
                const totalCompleted =
                  (bill.completed?.length || 0) + (bill['completed-institution']?.length || 0);

                return (
                  <div
                    key={bill.id}
                    className="exec-card p-4 flex flex-col justify-between space-y-3 hover:border-[#0075A2] transition"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#0075A2]/10 text-[#0075A2] dark:text-[#53afd0]">
                          {bill.category || 'Fee'}
                        </span>
                        <span className="text-base font-black font-sans text-[#1C244C] dark:text-[#F6F6F6]">
                          {bill.amountFormatted || `$${bill.amount.toFixed(2)} CAD`}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-[#1C244C] dark:text-[#F6F6F6] mb-1">
                        {bill.name}
                      </h3>
                      <div className="text-[11px] font-mono text-slate-400 mb-2">
                        docId: {bill.id}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mb-3">
                        {bill.description || 'No description provided.'}
                      </p>

                      {/* Allowed Payments */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {(bill['allowed-payments'] || []).map((m) => (
                          <span
                            key={m}
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                          >
                            {m}
                          </span>
                        ))}
                      </div>

                      {/* Payers Stats */}
                      <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 text-center">
                        <div>
                          <div className="text-[10px] text-slate-400">Completed</div>
                          <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                            {totalCompleted}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400">Unpaid</div>
                          <div className="text-sm font-black text-amber-600 dark:text-amber-400">
                            {totalIncomplete}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                      <div className="text-[10px] font-mono text-slate-400">
                        {bill['time-deadline'] ? `Due ${formatDDMMYYYY(bill['time-deadline'])}` : 'No deadline'}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditPaymentModal(bill)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-[#0075A2] dark:hover:text-[#53afd0] transition cursor-pointer"
                          title="Edit Payment"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBillToDelete(bill);
                            setIsDeleteBillOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          title="Delete Payment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* MODAL 1: RECORD/EDIT TRANSACTION (LEDGER)                           */}
      {/* =================================================================== */}
      {isLedgerModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-viewFadeIn">
            <div className="exec-card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                <h3 className="text-base font-black font-sans text-[#1C244C] dark:text-[#F6F6F6]">
                  {editingLedgerRecord ? 'Edit Society Transaction' : 'Record New Transaction'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsLedgerModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveLedgerRecord} className="space-y-4 text-xs">
                {/* Flow Type Toggle */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Transaction Flow Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setLedgerTxType('deposit');
                        if (txRecipient === '') setTxRecipient('UCDS');
                        if (txSender === 'UCDS') setTxSender('');
                      }}
                      className={`py-2 px-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        ledgerTxType === 'deposit'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <TrendingUp className="w-4 h-4" />
                      <span>Deposit (Inbound +$)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setLedgerTxType('withdrawal');
                        if (txSender === '') setTxSender('UCDS');
                        if (txRecipient === 'UCDS') setTxRecipient('');
                      }}
                      className={`py-2 px-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        ledgerTxType === 'withdrawal'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <TrendingDown className="w-4 h-4" />
                      <span>Withdrawal (Outbound -$)</span>
                    </button>
                  </div>
                </div>

                {/* Recipient & Sender */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Recipient *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. UCDS or Payee Name"
                      value={txRecipient}
                      onChange={(e) => setTxRecipient(e.target.value)}
                      className="exec-input text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Sender *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Debater, SU, or UCDS"
                      value={txSender}
                      onChange={(e) => setTxSender(e.target.value)}
                      className="exec-input text-xs"
                      required
                    />
                  </div>
                </div>

                {/* Associated Email */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Associated Email *
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. debater@ucalgary.ca"
                    value={txEmail}
                    onChange={(e) => setTxEmail(e.target.value)}
                    className="exec-input text-xs"
                    required
                  />
                </div>

                {/* Method & Amount ($ CAD) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Payment Method *
                    </label>
                    <CustomSelect
                      value={txMethod}
                      onChange={(val) => setTxMethod(val)}
                      options={[
                        { value: 'E-transfer', label: 'E-transfer' },
                        { value: 'Stripe', label: 'Stripe' },
                        { value: 'PayPal', label: 'PayPal' },
                        { value: 'Other', label: 'Other' },
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Amount ($ CAD) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="xx.xx"
                      value={txAmount}
                      onChange={(e) => setTxAmount(e.target.value)}
                      className="exec-input text-xs"
                      required
                    />
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Date of Payment (DD/MM/YYYY) *
                  </label>
                  <input
                    type="date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="exec-input text-xs"
                    required
                  />
                </div>

                {/* Details */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Transaction Details / Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Annual membership dues, team registration fee, plaque engraving..."
                    value={txDetails}
                    onChange={(e) => setTxDetails(e.target.value)}
                    className="exec-input text-xs"
                  />
                </div>

                {/* Auto-Resolution Notice */}
                {ledgerTxType === 'deposit' && (
                  <div className="p-2.5 rounded-xl bg-[#0075A2]/10 dark:bg-[#53afd0]/10 border border-[#0075A2]/20 text-[11px] text-[#0075A2] dark:text-[#53afd0]">
                    ⚡ If this email or sender matches an outstanding fee in Payments, saving this deposit will automatically resolve the fee!
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setIsLedgerModalOpen(false)}
                    className="btn-exec-return text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingLedger}
                    className="btn-exec-primary text-xs"
                  >
                    {isSavingLedger ? 'Saving...' : editingLedgerRecord ? 'Update Transaction' : 'Save Transaction'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* =================================================================== */}
      {/* MODAL 2: DELETE LEDGER CONFIRMATION                                 */}
      {/* =================================================================== */}
      {isDeleteLedgerOpen &&
        ledgerToDelete &&
        createPortal(
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-viewFadeIn">
            <div className="exec-card w-full max-w-md p-6 space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <AlertCircle className="w-6 h-6 flex-shrink-0" />
                <h3 className="text-base font-black font-sans">Delete Ledger Record</h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Are you sure you want to permanently delete the transaction between{' '}
                <strong>{ledgerToDelete.sender}</strong> and <strong>{ledgerToDelete.recipient}</strong>?
                This will recalculate the operating cash balance immediately.
              </p>
              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsDeleteLedgerOpen(false)}
                  className="btn-exec-return text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteLedger}
                  className="py-2 px-4 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 cursor-pointer transition"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* =================================================================== */}
      {/* MODAL 3: GOOGLE SHEETS 2-WAY SYNC                                   */}
      {/* =================================================================== */}
      {isSheetsModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-viewFadeIn">
            <div className="exec-card w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-base font-black font-sans text-[#1C244C] dark:text-[#F6F6F6]">
                    Google Sheets & Firestore Linking
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSheetsModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>
                  To optimize quota and decrease client/server reads, the Google Sheet operates on a{' '}
                  <strong>prompt-only update model</strong>. It strictly matches the 8 columns of the UCDS Finance portal:
                </p>

                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                  Recipient | Sender | Email | Method | Deposit ($ CAD) | Withdrawal ($ CAD) | Details | Date (DD/MM/YYYY)
                </div>

                <div className="space-y-1.5 pt-2">
                  <h4 className="font-bold text-[#1C244C] dark:text-[#F6F6F6]">
                    Setup in Google Sheets (1 Minute):
                  </h4>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400">
                    <li>Open your Google Sheet and click <strong>Extensions &gt; Apps Script</strong>.</li>
                    <li>
                      Paste the generated script file located at{' '}
                      <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono">
                        scripts/googleAppsScript_LedgerSync.js
                      </code>
                      .
                    </li>
                    <li>Save the script and refresh your Google Sheet.</li>
                    <li>
                      A new top menu item <strong>🏛️ UCDS Finance &gt; Sync from Firestore</strong> will appear to pull and format transactions!
                    </li>
                  </ol>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold">
                  <span>Fast CSV Export with Exact 8 Columns:</span>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="py-1.5 px-3 rounded-lg bg-emerald-600 text-white text-xs hover:bg-emerald-700 cursor-pointer transition flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download CSV</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={handleCopyAppsScript}
                  className="btn-exec-return flex items-center gap-1.5 text-xs"
                >
                  {copiedScript ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedScript ? 'Path Copied!' : 'Copy Script Path'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsSheetsModalOpen(false)}
                  className="btn-exec-primary text-xs"
                >
                  Done
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* =================================================================== */}
      {/* MODAL 4: CREATE / EDIT PAYMENT BILL                                 */}
      {/* =================================================================== */}
      {isPaymentModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-viewFadeIn">
            <div className="exec-card w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                <div>
                  <h3 className="text-base font-black font-sans text-[#1C244C] dark:text-[#F6F6F6]">
                    {editingPaymentBill ? 'Edit Payment Item' : 'Create New Payment Item'}
                  </h3>
                  <div className="text-[11px] font-mono text-slate-400">
                    Document Slug:{' '}
                    <span className="text-[#0075A2] dark:text-[#53afd0]">
                      {editingPaymentBill ? editingPaymentBill.id : slugifyPaymentName(billName) || '(auto-generated)'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSavePaymentBill} className="space-y-4 text-xs">
                {/* Payment Name */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Calgary Invitational Debate Tournament 2026"
                    value={billName}
                    onChange={(e) => setBillName(e.target.value)}
                    className="exec-input text-xs"
                    required
                  />
                </div>

                {/* Amount & Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Amount ($ CAD) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="25.00"
                      value={billAmount}
                      onChange={(e) => setBillAmount(e.target.value)}
                      className="exec-input text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Category *
                    </label>
                    <CustomSelect
                      value={billCategory}
                      onChange={(val) => setBillCategory(val)}
                      options={[
                        { value: 'Society Dues', label: 'Society Dues' },
                        { value: 'Tournament Fee', label: 'Tournament Fee' },
                        { value: 'Event Pass', label: 'Event Pass' },
                        { value: 'Travel Deposit', label: 'Travel Deposit' },
                        { value: 'Merchandise', label: 'Merchandise' },
                        { value: 'Workshop', label: 'Workshop' },
                      ]}
                    />
                  </div>
                </div>

                {/* Allowed Payment Methods */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Allowed Payment Methods *
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['etransfer', 'paypal', 'stripe'].map((method) => {
                      const isSelected = billAllowedPayments.includes(method);
                      return (
                        <button
                          key={method}
                          type="button"
                          onClick={() => handleToggleAllowedPayment(method)}
                          className={`py-1.5 px-3 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'bg-[#0075A2] text-white dark:bg-[#53afd0] dark:text-[#15162C]'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                          <span className="capitalize">{method}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Schedule Open & Deadline */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Open Time (Optional)
                    </label>
                    <input
                      type="date"
                      value={billTimeOpen}
                      onChange={(e) => setBillTimeOpen(e.target.value)}
                      className="exec-input text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Deadline (time-deadline)
                    </label>
                    <input
                      type="date"
                      value={billTimeDeadline}
                      onChange={(e) => setBillTimeDeadline(e.target.value)}
                      className="exec-input text-xs"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Fee purpose, details, and inclusions..."
                    value={billDescription}
                    onChange={(e) => setBillDescription(e.target.value)}
                    className="exec-input text-xs"
                  />
                </div>

                {/* Payer Assignment: Registered Users & External Emails */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200">
                      Assign Individuals (incomplete)
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Add registered members or external emails (unlimited).
                    </p>
                  </div>

                  {/* External Email Input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Add email(s) separated by commas..."
                      value={externalEmailInput}
                      onChange={(e) => setExternalEmailInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddExternalEmails();
                        }
                      }}
                      className="exec-input text-xs flex-1"
                    />
                    <button
                      type="button"
                      onClick={handleAddExternalEmails}
                      className="py-2 px-3 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-[#0075A2] hover:text-white transition cursor-pointer"
                    >
                      Add
                    </button>
                  </div>

                  {/* Assigned Individual Chips */}
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
                    {billIncompleteUsers.map((em) => (
                      <span
                        key={em}
                        className="inline-flex items-center gap-1.5 py-1 px-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[11px] font-mono"
                      >
                        <span>{em}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveIncompleteUser(em)}
                          className="text-slate-400 hover:text-rose-500 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {billIncompleteUsers.length === 0 && (
                      <div className="text-[11px] text-slate-400 italic">
                        No individuals assigned yet.
                      </div>
                    )}
                  </div>
                </div>

                {/* Institution Assignment (Organizations) */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200">
                      Assign Institutions (incomplete-institution)
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Select participating universities/clubs. Will use their finance billing email.
                    </p>
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-1 p-1">
                    {organizations
                      .filter((o) => o.id !== '_default')
                      .slice(0, 30)
                      .map((org) => {
                        const isAssigned = billIncompleteInst.includes(org.id);
                        return (
                          <div
                            key={org.id}
                            onClick={() => handleToggleIncompleteOrg(org.id)}
                            className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer text-xs transition ${
                              isAssigned
                                ? 'bg-[#0075A2]/10 border-[#0075A2]/30 text-[#0075A2] dark:text-[#53afd0]'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span className="font-bold truncate">{org.name}</span>
                            <span className="text-[10px] font-mono opacity-70">
                              {org['email-finance'] || org.email || org.id}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="btn-exec-return text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingBill}
                    className="btn-exec-primary text-xs"
                  >
                    {isSavingBill ? 'Saving...' : editingPaymentBill ? 'Update Bill' : 'Create Bill'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* =================================================================== */}
      {/* MODAL 5: DELETE PAYMENT BILL CONFIRMATION                           */}
      {/* =================================================================== */}
      {isDeleteBillOpen &&
        billToDelete &&
        createPortal(
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-viewFadeIn">
            <div className="exec-card w-full max-w-md p-6 space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <AlertCircle className="w-6 h-6 flex-shrink-0" />
                <h3 className="text-base font-black font-sans">Delete Payment Item</h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Are you sure you want to delete <strong>{billToDelete.name}</strong>?
                This will remove the payment bill and any incomplete lists from society records.
              </p>
              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsDeleteBillOpen(false)}
                  className="btn-exec-return text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteBill}
                  className="py-2 px-4 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 cursor-pointer transition"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </ExecutiveLayout>
  );
};

export default ExecutiveFinance;
