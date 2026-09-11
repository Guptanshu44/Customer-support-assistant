import { api, extractShortIssue, detectCustomerIntent, isFollowUpMessage } from '../frontend/src/api/client.js';

async function runTests() {
  console.log('=== TEST 1: Initial English Network Issue ===');
  const res1 = await api.analyzeCustomerMessage('why my network is slow', 'Ashu', 0, [], null);
  console.log('Turn 1 Suggested Reply:\n', res1.suggested_reply);
  console.log('Has emojis:', /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(res1.suggested_reply));

  console.log('\n=== TEST 2: Hindi Follow-Up Network Issue ===');
  const res2 = await api.analyzeCustomerMessage(
    'हाँ चेक कर लिया सब, फिर भी नेट नहीं चल रहा',
    'राहुल',
    1,
    [{ customer_message: 'इंटरनेट बहुत धीमा चल रहा है', agent_message: 'कृपया राउटर रीस्टार्ट करें' }],
    { id: 'TK-101', title: 'इंटरनेट कनेक्टिविटी समस्या' }
  );
  console.log('Hindi Follow-Up Suggested Reply:\n', res2.suggested_reply);
  console.log('Has emojis:', /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(res2.suggested_reply));

  console.log('\n=== TEST 3: Payment Follow-Up ===');
  const res3 = await api.analyzeCustomerMessage(
    'yes i checked my bank statement, still debited twice',
    'Priya',
    1,
    [{ customer_message: 'money was deducted twice', agent_message: 'Let me check your transaction' }],
    { id: 'TK-202', title: 'Double payment deduction' }
  );
  console.log('Payment Follow-Up Suggested Reply:\n', res3.suggested_reply);
  console.log('Has emojis:', /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(res3.suggested_reply));

  console.log('\n=== TEST 4: Gratitude / Thank you ===');
  const res4 = await api.analyzeCustomerMessage('thank you so much, it is resolved now!', 'Ashu', 2, [], null);
  console.log('Thank You Suggested Reply:\n', res4.suggested_reply);
  console.log('Has emojis:', /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(res4.suggested_reply));
}

runTests().catch(console.error);
