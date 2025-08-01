# E Mart Admin Panel

এই অ্যাডমিন প্যানেলটি E Mart ওয়েবসাইটের জন্য তৈরি করা হয়েছে।

## 🔐 লগইন সিস্টেম

- **গুগল সাইন-ইন**: শুধুমাত্র `tanvirrrhasan@gmail.com` এই ইমেল অ্যাড্রেস দিয়ে লগইন করা যাবে
- **নিরাপত্তা**: অন্য কোনো গুগল অ্যাকাউন্ট দিয়ে লগইন করার চেষ্টা করলে স্বয়ংক্রিয়ভাবে লগ আউট হয়ে যাবে

## 🚀 ব্যবহার পদ্ধতি

1. **লগইন**: "Sign in with Google" বোতামে ক্লিক করুন
2. **গুগল অ্যাকাউন্ট নির্বাচন**: `tanvirrrhasan@gmail.com` অ্যাকাউন্টটি নির্বাচন করুন
3. **অ্যাডমিন প্যানেল**: সফল লগইনের পর অ্যাডমিন প্যানেল খুলবে

## 📁 ফাইল স্ট্রাকচার

```
admin/
├── index.html          # অ্যাডমিন প্যানেল HTML
├── app.js             # অ্যাডমিন প্যানেল JavaScript
├── style.css          # অ্যাডমিন প্যানেল CSS
├── firebase-config.js # Firebase কনফিগারেশন
├── firestore.rules    # Firestore নিরাপত্তা নিয়ম
├── firebase.json      # Firebase প্রজেক্ট কনফিগারেশন
└── README.md          # এই ফাইল
```

## 🔧 Firebase কনফিগারেশন

### Firestore Rules
অ্যাডমিন প্যানেলের জন্য বিশেষ Firestore নিয়ম সেট করা হয়েছে:
- শুধুমাত্র অনুমোদিত অ্যাডমিন ইমেল (`tanvirrrhasan@gmail.com`) প্রোডাক্ট, ক্যাটাগরি, অর্ডার ইত্যাদি পরিবর্তন করতে পারবে
- সাধারণ ব্যবহারকারীরা শুধু প্রোডাক্ট এবং ক্যাটাগরি পড়তে পারবে
- অর্ডার তৈরি করা যাবে, কিন্তু শুধু অ্যাডমিন পড়তে এবং আপডেট করতে পারবে

### Storage Rules
ছবি আপলোডের জন্য Firebase Storage নিয়ম সেট করা আছে।

## 🛠️ ফিচারসমূহ

### Dashboard
- প্রোডাক্ট ওভারভিউ
- সাম্প্রতিক প্রোডাক্ট দেখানো

### Add Product
- নতুন প্রোডাক্ট যোগ করা
- ছবি আপলোড (মাল্টিপল)
- কালার এবং সাইজ ভেরিয়েন্ট
- ওয়ারেন্টি এবং ডেলিভারি তথ্য

### Manage Products
- প্রোডাক্ট এডিট/ডিলিট
- স্টক আপডেট
- প্রাইস পরিবর্তন

### Categories
- নতুন ক্যাটাগরি যোগ করা
- ক্যাটাগরি এডিট/ডিলিট

### Orders
- অর্ডার তালিকা দেখানো
- অর্ডার স্ট্যাটাস আপডেট
- অর্ডার বিবরণ দেখানো

## 🔒 নিরাপত্তা

- শুধুমাত্র অনুমোদিত গুগল অ্যাকাউন্ট দিয়ে লগইন
- Firestore নিয়ম দ্বারা ডেটা সুরক্ষা
- স্বয়ংক্রিয় লগ আউট সিস্টেম

## 📞 সাপোর্ট

কোনো সমস্যা হলে:
- ইমেল: tanvirrrhasan@gmail.com
- ফোন: +8801774673399

---

**© 2024 E Mart Admin Panel. All rights reserved.** 