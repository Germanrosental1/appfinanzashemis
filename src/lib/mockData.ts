
import { User, Transaction, BankStatement, Category, Project, AccountSummary, DashboardMetrics } from "@/types";
import { processPDF } from "./pdfProcessor";

// Mock Users
export const users: User[] = [
  {
    id: "finance-1",
    email: "finance@example.com",
    name: "María Financiera",
    role: "finance",
    avatar: "https://i.pravatar.cc/150?img=1",
  },
  {
    id: "comm-1",
    email: "comercial1@example.com",
    name: "Juan Comercial",
    role: "commercial",
    avatar: "https://i.pravatar.cc/150?img=2",
  },
  {
    id: "comm-2",
    email: "comercial2@example.com",
    name: "Ana Ventas",
    role: "commercial",
    avatar: "https://i.pravatar.cc/150?img=3",
  },
  {
    id: "admin-1",
    email: "admin@example.com",
    name: "Carlos Admin",
    role: "admin",
    avatar: "https://i.pravatar.cc/150?img=4",
  },
];

// Mock Categories
export const categories: Category[] = [
  { id: "cat-1", name: "Viáticos", description: "Gastos de viaje y dietas" },
  { id: "cat-2", name: "Insumos", description: "Material de oficina y consumibles" },
  { id: "cat-3", name: "Logística", description: "Transporte y envíos" },
  { id: "cat-4", name: "Marketing", description: "Publicidad y promoción" },
  { id: "cat-5", name: "Software", description: "Licencias y servicios digitales" },
  { id: "cat-6", name: "Hardware", description: "Equipos y dispositivos" },
  { id: "cat-7", name: "Formación", description: "Cursos y desarrollo profesional" },
  { id: "cat-8", name: "Representación", description: "Atención a clientes" },
];

// Mock Projects
export const projects: Project[] = [
  { id: "proj-1", name: "Proyecto Alfa", code: "ALF-2025", isActive: true },
  { id: "proj-2", name: "Cliente Beta", code: "BET-2025", isActive: true },
  { id: "proj-3", name: "Desarrollo Gamma", code: "GAM-2025", isActive: true },
  { id: "proj-4", name: "Mantenimiento Delta", code: "DEL-2025", isActive: false },
  { id: "proj-5", name: "Expansión Epsilon", code: "EPS-2025", isActive: true },
];

// Mock Bank Statements
export const bankStatements: BankStatement[] = [];


// Generate mock transactions
const generateMockTransactions = (): Transaction[] => {
  // No generamos transacciones de ejemplo
  return [];
};

export const transactions: Transaction[] = [];

// Generate account summaries
export const generateAccountSummaries = (): AccountSummary[] => {
  return [];
};

// Generate dashboard metrics
export const getDashboardMetrics = (): DashboardMetrics => {
  const accountSummaries = generateAccountSummaries();
  
  return {
    totalTransactions: 0,
    classifiedTransactions: 0,
    pendingTransactions: 0,
    completionRate: 0,
    accountSummaries,
  };
};

// Mock authentication functions
export const mockLogin = (email: string, password: string): Promise<User | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      resolve(user || null);
    }, 800);
  });
};

// Mock function to get transactions by user ID
export const getTransactionsByUser = (userId: string): Transaction[] => {
  return transactions.filter(t => t.assignedTo === userId);
};

// Mock function to get transactions by account
export const getTransactionsByAccount = (account: string): Transaction[] => {
  return transactions.filter(t => t.account === account);
};

// Mock function to update a transaction
export const updateTransaction = (transactionId: string, updates: Partial<Transaction>): Promise<Transaction> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const index = transactions.findIndex(t => t.id === transactionId);
      if (index !== -1) {
        transactions[index] = { ...transactions[index], ...updates };
      }
      resolve(transactions[index]);
    }, 300);
  });
};

// Function to upload a bank statement
export const uploadBankStatement = (file: File, processedTransactions?: Transaction[]): Promise<BankStatement> => {
  return new Promise(async (resolve) => {
    // Crear un nuevo statement con estado 'processing'
    const newStatement: BankStatement = {
      id: `bs-${bankStatements.length + 1}`,
      fileName: file.name,
      uploadDate: new Date().toISOString(),
      period: "Abril 2025", // Se actualizará con la información extraída del archivo
      status: "processing",
      transactionCount: 0,
      accounts: []
    };
    
    try {
      // Determinar el tipo de archivo
      const fileType = file.name.split('.').pop()?.toLowerCase();
      console.log('Tipo de archivo detectado:', fileType);
      
      // Si ya tenemos transacciones procesadas (por OpenAI), usarlas directamente
      if (processedTransactions && processedTransactions.length > 0) {
        console.log(`Usando ${processedTransactions.length} transacciones procesadas por OpenAI`);
        
        // Actualizar el statement con los datos de las transacciones procesadas
        newStatement.status = "processed";
        newStatement.transactionCount = processedTransactions.length;
        
        // Extraer cuentas únicas de las transacciones
        const uniqueAccounts = [...new Set(processedTransactions.map(tx => tx.account))];
        newStatement.accounts = uniqueAccounts;
        
        // Extraer el período del nombre del archivo
        // Ejemplo: "PNC CC 042025.pdf" -> "Abril 2025"
        const monthNames = [
          'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        
        const fileNameMatch = /(?:PNC|CC)\s*(\d{2})(\d{4})/i.exec(file.name);
        if (fileNameMatch && fileNameMatch[1] && fileNameMatch[2]) {
          const month = parseInt(fileNameMatch[1], 10);
          const year = parseInt(fileNameMatch[2], 10);
          
          if (month >= 1 && month <= 12) {
            newStatement.period = `${monthNames[month - 1]} ${year}`;
          }
        }
        
        // Agregar las transacciones al array global
        transactions.push(...processedTransactions);
        
        console.log(`Transacciones procesadas por OpenAI guardadas: ${processedTransactions.length}`);
        console.log(`Período detectado: ${newStatement.period}`);
        console.log(`Cuentas detectadas: ${newStatement.accounts.join(', ')}`);
      }
      // Procesar el archivo según su tipo (solo si no tenemos transacciones procesadas)
      else if (fileType === 'pdf') {
        console.log('Procesando archivo PDF localmente...');
        // Usar el procesador de PDFs local
        const pdfTransactions = await processPDF(file);
        
        // Actualizar el statement con los datos extraídos
        newStatement.status = "processed";
        newStatement.transactionCount = pdfTransactions.length;
        
        // Extraer cuentas únicas de las transacciones
        const uniqueAccounts = [...new Set(pdfTransactions.map(tx => tx.account))];
        newStatement.accounts = uniqueAccounts;
        
        // Extraer el período del nombre del archivo
        // Ejemplo: "PNC CC 042025.pdf" -> "Abril 2025"
        const monthNames = [
          'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        
        const fileNameMatch = /(?:PNC|CC)\s*(\d{2})(\d{4})/i.exec(file.name);
        if (fileNameMatch && fileNameMatch[1] && fileNameMatch[2]) {
          const month = parseInt(fileNameMatch[1], 10);
          const year = parseInt(fileNameMatch[2], 10);
          
          if (month >= 1 && month <= 12) {
            newStatement.period = `${monthNames[month - 1]} ${year}`;
          }
        }
        
        // Agregar las transacciones al array global
        transactions.push(...pdfTransactions);
        
        console.log(`PDF procesado localmente: ${pdfTransactions.length} transacciones encontradas`);
        console.log(`Período detectado: ${newStatement.period}`);
        console.log(`Cuentas detectadas: ${newStatement.accounts.join(', ')}`);
      } else if (['xlsx', 'xls', 'csv'].includes(fileType || '')) {
        console.log('Procesando archivo Excel/CSV...');
        // Aquí iría la lógica para procesar Excel/CSV
        // Por ahora, usamos datos de muestra
        setTimeout(() => {
          newStatement.status = "processed";
          newStatement.transactionCount = Math.floor(Math.random() * 50 + 80);
          newStatement.accounts = ["1234", "5678", "9012"];
        }, 1000);
      } else {
        console.error('Tipo de archivo no soportado');
        throw new Error('Tipo de archivo no soportado');
      }
      
      // Agregar el statement a la lista
      bankStatements.push(newStatement);
      
      resolve(newStatement);
    } catch (error) {
      console.error('Error al procesar el archivo:', error);
      newStatement.status = "error";
      bankStatements.push(newStatement);
      resolve(newStatement);
    }
  });
};

// Helper to find category by ID
export const getCategoryById = (categoryId: string): Category | undefined => {
  return categories.find(c => c.id === categoryId);
};

// Helper to find project by ID
export const getProjectById = (projectId: string): Project | undefined => {
  return projects.find(p => p.id === projectId);
};
