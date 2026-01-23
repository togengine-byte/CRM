              <TableBody>
                {customers?.map((customer) => (
                  <>
                    <TableRow
                      key={customer.id}
                      onClick={() => {
                        setSelectedCustomerId(customer.id);
                        setIsDetailsOpen(selectedCustomerId === customer.id ? !isDetailsOpen : true);
                      }}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <TableCell className="font-medium">{customer.name || "-"}</TableCell>
                      <TableCell>{customer.companyName || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{customer.email || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{customer.phone || "-"}</TableCell>
                      <TableCell>{getStatusBadge(customer.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(customer.createdAt).toLocaleDateString("he-IL")}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditCustomer(customer)}>
                              <Pencil className="ml-2 h-4 w-4" />
                              עריכה
                            </DropdownMenuItem>
                            {customer.status === "pending_approval" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleApprove(customer.id)}
                                  className="text-green-600 focus:text-green-600"
                                >
                                  <CheckCircle className="ml-2 h-4 w-4" />
                                  אישור
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleOpenRejectDialog(customer.id)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <XCircle className="ml-2 h-4 w-4" />
                                  דחייה
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    {selectedCustomerId === customer.id && isDetailsOpen && customerDetails && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={7}>
                          <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                              <div>
                                <p className="text-sm text-muted-foreground">שם</p>
                                <p className="font-medium">{customerDetails.name || "-"}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">אימייל</p>
                                <p className="font-medium">{customerDetails.email || "-"}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">טלפון</p>
                                <p className="font-medium">{customerDetails.phone || "-"}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">חברה</p>
                                <p className="font-medium">{customerDetails.companyName || "-"}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">כתובת</p>
                                <p className="font-medium">{customerDetails.address || "-"}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">סטטוס</p>
                                <div className="mt-1">{getStatusBadge(customerDetails.status)}</div>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">תפקיד</p>
                                <p className="font-medium">{customerDetails.role || "-"}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">תאריך הרשמה</p>
                                <p className="font-medium">{new Date(customerDetails.createdAt).toLocaleDateString("he-IL")}</p>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
