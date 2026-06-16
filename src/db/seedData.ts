import { Card } from "./schema";

export const SEED_CARDS: Omit<Card, "id">[] = [
  {
    question: "Trong SQL, Clause WHERE khác biệt như thế nào so với HAVING? Điểm cốt lõi về thứ tự thực thi là gì?",
    answer: "WHERE dùng để lọc dòng TRƯỚC khi gom nhóm (GROUP BY). HAVING dùng để lọc nhóm SAU khi đã gom nhóm. Thứ tự thực thi logical: FROM -> WHERE -> GROUP BY -> HAVING -> SELECT.",
    codeSnippet: `-- HỢP LỆ: WHERE lọc trước, HAVING lọc nhóm sau
SELECT department_id, COUNT(*) as emp_count
FROM employees
WHERE salary > 50000
GROUP BY department_id
HAVING COUNT(*) > 5;`,
    category: "SQL",
    difficulty: "Junior",
    repetitions: 0,
    interval: 0,
    easeFactor: 2.5,
    nextReview: new Date(),
    bookmarked: 0,
    isCustom: 0
  },
  {
    question: "Sự khác nhau giữa UNION và UNION ALL trong SQL là gì? Khi nào nên ưu tiên dùng loại nào và tại sao?",
    answer: "UNION ALL nối trực tiếp kết quả và giữ nguyên toàn bộ các dòng trùng lặp (không lọc trùng, chạy rất nhanh). UNION sẽ loại bỏ dòng trùng lặp bằng cách sắp xếp (Sort) hoặc băm (Hash) dữ liệu, gây tốn CPU/Memory. Quy tắc: Luôn ưu tiên dùng UNION ALL trừ khi bắt buộc phải loại bỏ dữ liệu trùng lặp.",
    codeSnippet: `-- UNION ALL: Nối trực tiếp, rất nhanh
SELECT user_id, email FROM active_users
UNION ALL
SELECT user_id, email FROM archived_users;

-- UNION: Phải sắp xếp/băm để lọc trùng, chậm
SELECT city FROM customers
UNION
SELECT city FROM suppliers;`,
    category: "SQL",
    difficulty: "Junior",
    repetitions: 0,
    interval: 0,
    easeFactor: 2.5,
    nextReview: new Date(),
    bookmarked: 0,
    isCustom: 0
  },
  {
    question: "Tại sao việc đánh B-Tree Index trên UUID v4 ngẫu nhiên lại gây suy giảm hiệu năng nghiêm trọng so với Auto-increment ID?",
    answer: "B-Tree Index yêu cầu dữ liệu có thứ tự để chèn tối ưu. UUID v4 ngẫu nhiên làm dữ liệu chèn vào các vị trí bất kỳ ở giữa các trang Index, gây ra Phân mảnh trang (Page Splits) nghiêm trọng, tăng Random Write IOPS và làm tràn bộ đệm (Cache Thrashing). Giải pháp: Dùng UUID v7 sắp xếp theo thời gian (Time-ordered) để đảm bảo tính tăng dần khi chèn.",
    codeSnippet: `-- UUID v4 (Ngẫu nhiên - Gây phân mảnh index nặng):
-- a3b89c21-72f1-482a-9952-198bc725139a
     
-- UUID v7 (Sắp xếp theo thời gian - Khuyên dùng):
-- 018c6508-32a4-712c-9a4f-561b369c0d12`,
    category: "Database",
    difficulty: "Mid",
    repetitions: 0,
    interval: 0,
    easeFactor: 2.5,
    nextReview: new Date(),
    bookmarked: 0,
    isCustom: 0
  },
  {
    question: "Lệnh REINDEX thực sự làm gì đằng sau? Tại sao và khi nào chúng ta cần chạy nó trên Production?",
    answer: "REINDEX xây dựng lại index mới từ đầu để dọn dẹp không gian trống rác (Bloat - sinh ra do UPDATE/DELETE liên tục) và khóa index chết. Mặc định REINDEX sẽ khóa ghi và đọc toàn bảng (Access Exclusive lock). Để tránh nghẽn production, bắt buộc phải dùng tùy chọn CONCURRENTLY để chạy ngầm không khóa bảng.",
    codeSnippet: `-- CẢNH BÁO: Khóa toàn bảng, gây nghẽn Production!
REINDEX TABLE users;

-- AN TOÀN: Chạy ngầm, không khóa bảng (Khuyên dùng)
REINDEX TABLE CONCURRENTLY users;`,
    category: "Database",
    difficulty: "Senior",
    repetitions: 0,
    interval: 0,
    easeFactor: 2.5,
    nextReview: new Date(),
    bookmarked: 0,
    isCustom: 0
  },
  {
    question: "Closure trong JavaScript là gì? Hãy giải thích cơ chế hoạt động và cách nó có thể gây ra Memory Leak.",
    answer: "Closure là khả năng của một hàm con ghi nhớ và truy cập vào phạm vi lexical (lexical scope) của hàm cha, ngay cả khi hàm cha đã chạy xong. Nếu hàm con (closure) vẫn còn được tham chiếu (ví dụ gắn vào Global variable hoặc Event Listener) và nó chứa các biến lớn từ phạm vi cha, Garbage Collector không thể thu hồi vùng nhớ đó, gây ra Memory Leak.",
    codeSnippet: `function outer() {
  const largeArray = new Array(1000000).fill("data");
  return function inner() {
    console.log("closure active");
    // inner giữ tham chiếu đến outer scope, 
    // khiến largeArray không thể bị giải phóng!
  };
}
const myClosure = outer(); // Memory Leak xảy ra ở đây`,
    category: "JavaScript",
    difficulty: "Mid",
    repetitions: 0,
    interval: 0,
    easeFactor: 2.5,
    nextReview: new Date(),
    bookmarked: 0,
    isCustom: 0
  },
  {
    question: "Event Loop trong JavaScript hoạt động như thế nào? Sự khác nhau giữa Microtask Queue và Macrotask Queue là gì?",
    answer: "JS là ngôn ngữ đơn luồng. Event Loop liên tục kiểm tra Call Stack. Khi Call Stack trống, nó sẽ thực thi TOÀN BỘ task trong Microtask Queue (Promises, queueMicrotask). Chỉ khi Microtask Queue trống hoàn toàn, nó mới lấy 1 task từ Macrotask Queue (setTimeout, I/O) đưa vào Call Stack để thực thi.",
    codeSnippet: `console.log('1'); // Đồng bộ
setTimeout(() => console.log('2'), 0); // Macrotask
Promise.resolve().then(() => console.log('3')); // Microtask
console.log('4'); // Đồng bộ

// Kết quả in ra: 1 -> 4 -> 3 -> 2`,
    category: "JavaScript",
    difficulty: "Mid",
    repetitions: 0,
    interval: 0,
    easeFactor: 2.5,
    nextReview: new Date(),
    bookmarked: 0,
    isCustom: 0
  }
];

// Helper to seed cards database if empty
import { db } from "./schema";

export async function seedDatabase() {
  const count = await db.cards.count();
  if (count === 0) {
    await db.cards.bulkAdd(SEED_CARDS as Card[]);
    console.log("Database seeded successfully with fundamental cards.");
  }
}
