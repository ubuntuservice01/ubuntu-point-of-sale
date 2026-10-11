import {describe,expect,it} from "vitest";
import {canGrantCredit,creditPosition} from "./credit";
import type {CreditMovement,Customer} from "./domain";
const sample:CreditMovement[]=[
 {id:"c1",customerId:"u1",kind:"fiado",amount:1000,createdAt:"2026-09-01T09:00:00.000Z",dueDate:"2026-09-30"},
 {id:"c2",customerId:"u1",kind:"fiado",amount:500,createdAt:"2026-10-01T09:00:00.000Z",dueDate:"2026-10-31"},
 {id:"p1",customerId:"u1",kind:"pagamento",amount:600,createdAt:"2026-10-05T09:00:00.000Z",method:"dinheiro"},
 {id:"c3",customerId:"u2",kind:"fiado",amount:9999,createdAt:"2026-09-01T09:00:00.000Z"}
];
describe("fiado e contas a receber",()=>{
 it("abate pagamentos parcialmente às dívidas mais antigas",()=>{
  const r=creditPosition("u1",sample,"2026-10-11");
  expect(r.balance).toBe(900);
  expect(r.overdue).toBe(400);
  expect(r.items.map(x=>x.remaining)).toEqual([400,500]);
  expect(r.nextDue).toBe("2026-10-31");
 });
 it("isola movimentos de outros clientes",()=>{
  expect(creditPosition("u2",sample,"2026-10-11").balance).toBe(9999);
 });
 it("não inventa vencimento de dívida sem data",()=>{
  expect(creditPosition("u2",sample,"2026-10-11").overdue).toBe(0);
 });
 it("impede ultrapassar limite de crédito",()=>{
  const customer:Customer={id:"u1",name:"Cliente",phone:"",debt:900,creditLimit:1000};
  expect(canGrantCredit(customer,101)).toBe(false);
  expect(canGrantCredit(customer,100)).toBe(true);
 });
});
