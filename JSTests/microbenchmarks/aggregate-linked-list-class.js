class ListNode { value; next = null; constructor(value) { this.value = value; } }
function test(n) {
    let head = null;
    for (let i = 0; i < n; ++i) {
        let node = new ListNode(i);
        node.next = head;
        head = node;
    }
    let sum = 0;
    for (let node = head; node; node = node.next)
        sum += node.value;
    return sum;
}
noInline(test);
for (let i = 0; i < 200; ++i) {
    if (test(5000) !== 12497500)
        throw new Error("bad result");
}
